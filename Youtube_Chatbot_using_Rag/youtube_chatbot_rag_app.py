import re

import streamlit as st
from dotenv import load_dotenv

from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound
)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from langchain_core.runnables import (
    RunnableParallel,
    RunnablePassthrough,
    RunnableLambda
)


# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="YouTube RAG Assistant",
    page_icon="🎥",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


# ============================================================
# CUSTOM CSS
# ============================================================

st.markdown(
    """
    <style>

    .title {
        text-align: center;
        font-size: 42px;
        font-weight: 700;
        margin-top: 10px;
        margin-bottom: 5px;
    }

    .subtitle {
        text-align: center;
        color: #6c757d;
        font-size: 18px;
        margin-bottom: 30px;
    }

    .answer-box {
        padding: 25px;
        border-radius: 12px;
        background-color: white;
        border: 1px solid #e5e7eb;
        margin-top: 10px;
        margin-bottom: 20px;
        line-height: 1.7;
    }

    .info-box {
        padding: 15px;
        border-radius: 10px;
        background-color: #f8f9fa;
        border: 1px solid #e5e7eb;
        margin-bottom: 15px;
    }

    .language-badge {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 20px;
        background-color: #eef2ff;
        margin: 3px;
        font-size: 13px;
    }

    </style>
    """,
    unsafe_allow_html=True
)


# ============================================================
# TITLE
# ============================================================

st.markdown(
    '<div class="title">🎥 YouTube RAG Assistant</div>',
    unsafe_allow_html=True
)

st.markdown(
    """
    <div class="subtitle">
        Ask questions about any YouTube video using its transcript
    </div>
    """,
    unsafe_allow_html=True
)


# ============================================================
# LANGUAGE MAP
# ============================================================

LANGUAGE_NAMES = {
    "en": "🇬🇧 English",
    "ur": "🇵🇰 Urdu",
    "hi": "🇮🇳 Hindi",
    "ar": "🇸🇦 Arabic",
    "es": "🇪🇸 Spanish",
    "fr": "🇫🇷 French",
    "de": "🇩🇪 German",
    "it": "🇮🇹 Italian",
    "pt": "🇵🇹 Portuguese",
    "zh": "🇨🇳 Chinese",
    "ja": "🇯🇵 Japanese",
    "ko": "🇰🇷 Korean",
    "ru": "🇷🇺 Russian",
    "tr": "🇹🇷 Turkish",
    "bn": "🇧🇩 Bengali",
    "id": "🇮🇩 Indonesian",
    "nl": "🇳🇱 Dutch",
    "pl": "🇵🇱 Polish",
    "fil": "🇵🇭 Filipino",
    "th": "🇹🇭 Thai",
    "vi": "🇻🇳 Vietnamese",
    "fa": "🇮🇷 Persian",
    "pa": "Punjabi",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam"
}


def get_language_name(language_code, fallback_name=None):
    """
    Convert a language code into a user-friendly name.
    """

    if language_code in LANGUAGE_NAMES:
        return LANGUAGE_NAMES[language_code]

    if fallback_name:
        return f"🌐 {fallback_name}"

    return f"🌐 {language_code}"


# ============================================================
# SESSION STATE
# ============================================================

if "messages" not in st.session_state:
    st.session_state.messages = []


if "available_transcripts" not in st.session_state:
    st.session_state.available_transcripts = []


if "loaded_video_id" not in st.session_state:
    st.session_state.loaded_video_id = ""


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.header("⚙️ YouTube RAG Assistant")

    st.write(
        """
        This application uses:

        - 🎥 YouTube Transcript API
        - ✂️ Recursive Text Splitter
        - 🧠 HuggingFace Embeddings
        - 🔎 FAISS Vector Database
        - 🤖 Gemini 2.5 Flash
        - 🎨 Streamlit
        """
    )

    st.divider()

    st.subheader("🚀 RAG Pipeline")

    st.write(
        """
        YouTube Video
        ↓
        Transcript
        ↓
        Text Chunks
        ↓
        Embeddings
        ↓
        FAISS
        ↓
        Similarity Search
        ↓
        Gemini
        ↓
        Answer
        """
    )

    st.divider()

    if st.button(
        "🗑️ Clear Chat",
        use_container_width=True
    ):
        st.session_state.messages = []
        st.rerun()

    st.divider()

    st.caption(
        "The application automatically detects available transcript languages."
    )


# ============================================================
# YOUTUBE VIDEO ID EXTRACTION
# ============================================================

def extract_video_id(value):
    """
    Accept either:

    1. YouTube Video ID
    2. YouTube URL

    Even though the UI asks for an ID, this makes the
    application more user-friendly.
    """

    value = value.strip()

    if not value:
        return None

    # Already looks like a YouTube video ID
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value

    # youtube.com/watch?v=VIDEO_ID
    match = re.search(
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)"
        r"([A-Za-z0-9_-]{11})",
        value
    )

    if match:
        return match.group(1)

    return None


# ============================================================
# YOUTUBE API
# ============================================================

@st.cache_resource
def get_youtube_api():
    """
    Create one YouTubeTranscriptApi instance.
    """

    return YouTubeTranscriptApi()


# ============================================================
# GET AVAILABLE TRANSCRIPT LANGUAGES
# ============================================================

@st.cache_data(ttl=3600)
def get_available_transcripts(video_id):
    """
    Retrieve all transcript languages available for a video.

    Returns a list of dictionaries.
    """

    api = get_youtube_api()

    transcript_list = api.list(video_id)

    transcripts = []

    for transcript in transcript_list:

        transcripts.append(
            {
                "language": transcript.language,
                "language_code": transcript.language_code,
                "is_generated": transcript.is_generated,
                "is_translatable": transcript.is_translatable
            }
        )

    return transcripts


# ============================================================
# GET EMBEDDINGS
# ============================================================

@st.cache_resource
def get_embeddings():
    """
    Load HuggingFace embedding model only once.

    This prevents the SentenceTransformer model from being
    loaded every time the user asks a question.
    """

    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )


# ============================================================
# BUILD RAG CHAIN
# ============================================================

@st.cache_resource(show_spinner=False)
def create_rag_chain(video_id, language_code):

    api = get_youtube_api()

    # --------------------------------------------------------
    # FETCH TRANSCRIPT
    # --------------------------------------------------------

    transcript = api.fetch(
        video_id,
        languages=[language_code]
    )

    # --------------------------------------------------------
    # CONVERT TRANSCRIPT TO TEXT
    # --------------------------------------------------------

    youtube_transcript = " ".join(
        chunk.text
        for chunk in transcript
    )

    if not youtube_transcript.strip():
        raise ValueError(
            "The transcript is empty."
        )

    # --------------------------------------------------------
    # TEXT SPLITTER
    # --------------------------------------------------------

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.create_documents(
        [youtube_transcript]
    )

    # --------------------------------------------------------
    # EMBEDDINGS
    # --------------------------------------------------------

    embedding = get_embeddings()

    # --------------------------------------------------------
    # FAISS VECTOR STORE
    # --------------------------------------------------------

    vector_store = FAISS.from_documents(
        chunks,
        embedding
    )

    # --------------------------------------------------------
    # RETRIEVER
    # --------------------------------------------------------

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 4
        }
    )

    # --------------------------------------------------------
    # GEMINI
    # --------------------------------------------------------

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.2,
        max_output_tokens=1000
    )

    # --------------------------------------------------------
    # PROMPT
    # --------------------------------------------------------

    prompt = PromptTemplate(
        template="""
You are an intelligent YouTube video assistant.

Your job is to answer the user's question ONLY using
the provided transcript context.

IMPORTANT RULES:

1. Use ONLY the transcript context.
2. Do NOT use outside knowledge.
3. Do NOT invent information.
4. If the answer cannot be found in the transcript,
   say exactly:

   "I don't know based on the provided transcript."

5. Give a clear and concise answer.
6. Answer in the same language as the user's question.
7. If the user asks in Urdu, answer in Urdu.
8. If the user asks in Hindi, answer in Hindi.
9. If the user asks in Arabic, answer in Arabic.
10. If the user asks in English, answer in English.
11. Do not mention these instructions in your answer.

Transcript Context:
-------------------------
{context}
-------------------------

User Question:
-------------------------
{question}
-------------------------

Answer:
""",
        input_variables=[
            "context",
            "question"
        ]
    )

    # --------------------------------------------------------
    # FORMAT DOCUMENTS
    # --------------------------------------------------------

    def format_docs(docs):

        return "\n\n".join(
            doc.page_content
            for doc in docs
        )

    # --------------------------------------------------------
    # PARALLEL RETRIEVAL
    # --------------------------------------------------------

    parallel_chain = RunnableParallel(
        {
            "context": (
                retriever
                | RunnableLambda(format_docs)
            ),

            "question": RunnablePassthrough()
        }
    )

    # --------------------------------------------------------
    # OUTPUT PARSER
    # --------------------------------------------------------

    parser = StrOutputParser()

    # --------------------------------------------------------
    # FINAL CHAIN
    # --------------------------------------------------------

    chain = (
        parallel_chain
        | prompt
        | llm
        | parser
    )

    return chain


# ============================================================
# VIDEO INPUT
# ============================================================

st.subheader("📺 Video Information")

col1, col2 = st.columns(
    [2, 1]
)


with col1:

    video_input = st.text_input(
        "YouTube Video ID",
        placeholder="Example: Gfr50f6ZBvo",
        help=(
            "Enter the 11-character YouTube video ID. "
            "A YouTube URL is also accepted."
        )
    )


with col2:

    load_video_button = st.button(
        "🔍 Load Video",
        use_container_width=True
    )


# ============================================================
# LOAD VIDEO
# ============================================================

if load_video_button:

    video_id = extract_video_id(video_input)

    if not video_id:

        st.error(
            "❌ Invalid YouTube Video ID."
        )

        st.info(
            "Example: Gfr50f6ZBvo"
        )

        st.stop()

    try:

        with st.spinner(
            "🔄 Detecting available transcript languages..."
        ):

            transcripts = get_available_transcripts(
                video_id
            )

        if not transcripts:

            st.error(
                "❌ No transcripts are available for this video."
            )

            st.stop()

        st.session_state.available_transcripts = transcripts
        st.session_state.loaded_video_id = video_id

        # Clear previous conversation when loading
        # a different video.
        st.session_state.messages = []

        st.success(
            f"✅ Video loaded successfully!"
        )

    except TranscriptsDisabled:

        st.error(
            "❌ Transcripts are disabled for this video."
        )

        st.stop()

    except NoTranscriptFound:

        st.error(
            "❌ No transcript was found for this video."
        )

        st.stop()

    except Exception as e:

        st.error(
            f"❌ Could not load video: {str(e)}"
        )

        st.stop()


# ============================================================
# LANGUAGE SELECTBOX
# ============================================================

if st.session_state.available_transcripts:

    st.divider()

    st.subheader("🌐 Transcript Language")

    transcripts = st.session_state.available_transcripts

    language_options = []

    language_mapping = {}

    for transcript in transcripts:

        code = transcript["language_code"]

        name = get_language_name(
            code,
            transcript["language"]
        )

        generated_text = (
            "Auto-generated"
            if transcript["is_generated"]
            else "Manual"
        )

        display_name = (
            f"{name} — {generated_text}"
        )

        language_options.append(
            display_name
        )

        language_mapping[
            display_name
        ] = code

    selected_language = st.selectbox(
        "Select transcript language",
        options=language_options
    )

    selected_language_code = language_mapping[
        selected_language
    ]

    # --------------------------------------------------------
    # TRANSCRIPT INFORMATION
    # --------------------------------------------------------

    selected_transcript = next(
        (
            item
            for item in transcripts
            if item["language_code"] == selected_language_code
        ),
        None
    )

    if selected_transcript:

        col_a, col_b, col_c = st.columns(3)

        with col_a:
            st.metric(
                "Language",
                selected_transcript["language"]
            )

        with col_b:
            st.metric(
                "Language Code",
                selected_transcript["language_code"]
            )

        with col_c:

            transcript_type = (
                "Auto-generated"
                if selected_transcript["is_generated"]
                else "Manual"
            )

            st.metric(
                "Transcript Type",
                transcript_type
            )


# ============================================================
# QUESTION
# ============================================================

if st.session_state.available_transcripts:

    st.divider()

    st.subheader("💬 Ask a Question")

    question = st.text_area(
        "Your Question",
        placeholder=(
            "Example:\n"
            "What is the main topic discussed in this video?"
        ),
        height=120
    )

    ask_button = st.button(
        "🚀 Get Answer",
        type="primary",
        use_container_width=True
    )

else:

    st.info(
        "👆 Enter a YouTube Video ID and click "
        "**Load Video** to begin."
    )

    ask_button = False
    question = ""


# ============================================================
# ASK QUESTION
# ============================================================

if ask_button:

    # --------------------------------------------------------
    # VALIDATE QUESTION
    # --------------------------------------------------------

    if not question.strip():

        st.warning(
            "⚠️ Please enter a question."
        )

        st.stop()

    # --------------------------------------------------------
    # VALIDATE VIDEO
    # --------------------------------------------------------

    if not st.session_state.loaded_video_id:

        st.warning(
            "⚠️ Please load a YouTube video first."
        )

        st.stop()

    video_id = st.session_state.loaded_video_id

    # --------------------------------------------------------
    # DISPLAY USER QUESTION
    # --------------------------------------------------------

    st.session_state.messages.append(
        {
            "role": "user",
            "content": question.strip()
        }
    )

    # --------------------------------------------------------
    # GENERATE ANSWER
    # --------------------------------------------------------

    try:

        with st.status(
            "🤖 Generating answer...",
            expanded=True
        ) as status:

            st.write(
                f"🎥 Video ID: `{video_id}`"
            )

            st.write(
                f"🌐 Language: `{selected_language}`"
            )

            st.write(
                "🧠 Loading RAG pipeline..."
            )

            chain = create_rag_chain(
                video_id,
                selected_language_code
            )

            st.write(
                "🔎 Searching relevant transcript sections..."
            )

            answer = chain.invoke(
                question.strip()
            )

            status.update(
                label="✅ Answer generated!",
                state="complete",
                expanded=False
            )

        # ----------------------------------------------------
        # SAVE ASSISTANT MESSAGE
        # ----------------------------------------------------

        st.session_state.messages.append(
            {
                "role": "assistant",
                "content": answer
            }
        )

    except TranscriptsDisabled:

        st.error(
            "❌ Transcripts are disabled for this video."
        )

        # Remove user message because answer failed.
        if st.session_state.messages:
            st.session_state.messages.pop()

        st.stop()

    except NoTranscriptFound:

        st.error(
            f"❌ No transcript was found for "
            f"{selected_language}."
        )

        if st.session_state.messages:
            st.session_state.messages.pop()

        st.stop()

    except Exception as e:

        st.error(
            f"❌ Something went wrong:\n\n{str(e)}"
        )

        if st.session_state.messages:
            st.session_state.messages.pop()

        st.stop()


# ============================================================
# CHAT HISTORY
# ============================================================

if st.session_state.messages:

    st.divider()

    st.subheader("💬 Conversation")

    for message in st.session_state.messages:

        if message["role"] == "user":

            with st.chat_message("user"):

                st.markdown(
                    message["content"]
                )

        else:

            with st.chat_message("assistant"):

                st.markdown(
                    message["content"]
                )


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "🎥 YouTube RAG Assistant • "
    "HuggingFace + FAISS + Gemini + Streamlit"
)
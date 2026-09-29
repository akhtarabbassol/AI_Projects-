import { useState } from "react";
import { Bot, Send, User } from "lucide-react";

import { queryChat } from "../api/chat";
import { getApiErrorMessage } from "../api/client";

const welcomeMessage = {
  role: "system",
  text: "Hello! I'm your EKIS Knowledge Assistant. I've analyzed your company's documentation. How can I help you today?",
};

export default function Chat() {
  const [messages, setMessages] =
    useState([welcomeMessage]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  /* =======================================================
     SUBMIT CHAT QUERY
     ======================================================= */

  const submit = async (e) => {
    e?.preventDefault();

    const query = input.trim();

    if (!query || loading) {
      return;
    }

    setInput("");
    setError("");


    /* -------------------------------------------------------
       ADD USER MESSAGE + LOADING MESSAGE
       ------------------------------------------------------- */

    setMessages((current) => [
      ...current,

      {
        role: "user",
        text: query,
      },

      {
        role: "loading",
        text: "Thinking...",
      },
    ]);


    setLoading(true);


    /* =======================================================
       CALL CHAT API
       ======================================================= */

    try {
      const { data } =
        await queryChat(query, 5);


      /* -----------------------------------------------------
         REMOVE LOADING MESSAGE
         AND ADD AI RESPONSE
         ----------------------------------------------------- */

      setMessages((current) => [
        ...current.filter(
          (message) =>
            message.role !== "loading"
        ),

        {
          role: "system",
          text:
            data?.answer ||
            "The backend returned no answer.",
        },
      ]);

    } catch (err) {

      console.error(
        "Chat request error:",
        err
      );


      setMessages((current) => [
        ...current.filter(
          (message) =>
            message.role !== "loading"
        ),

        {
          role: "system",
          text: "I couldn't complete that request.",
        },
      ]);


      setError(
        getApiErrorMessage(
          err,
          "Chat request failed."
        )
      );

    } finally {

      setLoading(false);

    }
  };


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <section className="content-view active">

      <div className="chat-layout">

        {/* =================================================
            CHAT MAIN
            ================================================= */}

        <div className="chat-main">

          {/* ===============================================
              CHAT HEADER
              =============================================== */}

          <div className="chat-header">

            <h2>
              AI Knowledge Assistant
            </h2>

            <p>
              Ask questions against your authenticated
              company knowledge base.
            </p>

          </div>


          {/* ===============================================
              SCROLLABLE CHAT AREA
              =============================================== */}

          <div className="chat-messages">

            {messages.map(
              (msg, index) => (

                <div
                  className={`message ${
                    msg.role === "user"
                      ? "user"
                      : "system"
                  }`}
                  key={index}
                >

                  {/* -----------------------------------------
                      AVATAR
                      ----------------------------------------- */}

                  <div className="avatar">

                    {msg.role === "user" ? (
                      <User size={18} />
                    ) : (
                      <Bot size={18} />
                    )}

                  </div>


                  {/* -----------------------------------------
                      MESSAGE
                      ----------------------------------------- */}

                  <div>

                    <div className="bubble">
                      {msg.text}
                    </div>

                  </div>

                </div>

              )
            )}

          </div>


          {/* =================================================
              INPUT AREA
              ================================================= */}

          <form
            className="chat-input-area"
            onSubmit={submit}
          >

            <div className="chat-input-wrapper">

              <input
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                disabled={loading}
                placeholder="Ask anything about the company knowledge base..."
              />

              <button
                type="submit"
                className="btn-send"
                disabled={
                  loading ||
                  !input.trim()
                }
              >

                <Send size={18} />

              </button>

            </div>


            {/* =============================================
                ERROR
                ============================================= */}

            {error && (

              <p className="chat-error">
                {error}
              </p>

            )}


            {/* =============================================
                DISCLAIMER
                ============================================= */}

            <p className="chat-disclaimer">
              EKIS AI may provide inaccurate info.
              Verify with original documents.
            </p>

          </form>

        </div>

      </div>

    </section>
  );
}
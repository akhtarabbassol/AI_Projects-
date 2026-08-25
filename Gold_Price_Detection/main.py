import streamlit as st
import pandas as pd
import pickle


# ============================================
# PAGE CONFIGURATION
# ============================================

st.set_page_config(
    page_title="EUR/USD Prediction",
    page_icon="📈",
    layout="wide"
)


# ============================================
# LOAD SAVED MODEL
# ============================================

with open("model.pkl", "rb") as file:
    model = pickle.load(file)


# ============================================
# TITLE
# ============================================

st.title("📈 EUR/USD Prediction Dashboard")

st.write(
    "Random Forest Regression Model"
)

st.divider()


# ============================================
# MODEL INFORMATION
# ============================================

st.subheader("🤖 Model Information")

col1, col2, col3 = st.columns(3)

with col1:
    st.metric(
        "Model",
        "Random Forest"
    )

with col2:
    st.metric(
        "Trees",
        "100"
    )

with col3:
    st.metric(
        "Target",
        "EUR/USD"
    )


st.divider()


# ============================================
# USER INPUT
# ============================================

st.subheader("🔮 Enter Market Values")

col1, col2 = st.columns(2)


with col1:

    spx = st.number_input(
        "SPX",
        value=2000.0
    )

    gld = st.number_input(
        "GLD",
        value=120.0
    )


with col2:

    uso = st.number_input(
        "USO",
        value=30.0
    )

    slv = st.number_input(
        "SLV",
        value=20.0
    )


# ============================================
# CREATE INPUT DATAFRAME
# ============================================

input_data = pd.DataFrame(
    {
        "SPX": [spx],
        "GLD": [gld],
        "USO": [uso],
        "SLV": [slv]
    }
)


# ============================================
# SHOW INPUT DATA
# ============================================

st.subheader("📊 Input Data")

st.dataframe(
    input_data,
    use_container_width=True
)


# ============================================
# PREDICTION
# ============================================

if st.button(
    "🚀 Predict EUR/USD",
    use_container_width=True
):

    prediction = model.predict(input_data)

    predicted_value = prediction[0]

    st.success(
        f"Predicted EUR/USD: {predicted_value:.4f}"
    )


# ============================================
# FEATURE IMPORTANCE
# ============================================

st.divider()

st.subheader("📌 Feature Importance")

feature_importance = pd.DataFrame(
    {
        "Feature": [
            "SPX",
            "GLD",
            "USO",
            "SLV"
        ],
        "Importance": model.feature_importances_
    }
)

feature_importance = feature_importance.sort_values(
    by="Importance",
    ascending=False
)

st.dataframe(
    feature_importance,
    use_container_width=True
)





# ============================================
# FOOTER
# ============================================

st.divider()

st.caption(
    "EUR/USD Prediction | Random Forest Regression"
)
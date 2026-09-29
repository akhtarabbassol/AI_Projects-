import pickle as pk
import pandas as pd


with open("model/saved_model.pkl", 'rb') as f:
    model = pk.load(f)


MODEL_VERSION = "1.0.0" 

def predict_output(user_input: dict):
    user_input_df = pd.DataFrame([user_input])
    prediction = model.predict(user_input_df)[0]
    return prediction
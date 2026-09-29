from fastapi import FastAPI
from fastapi.responses import JSONResponse
from schema.user_input import user_validation
from model.predict import MODEL_VERSION, model, predict_output

app = FastAPI()



@app.get('/home')
def home():
    return JSONResponse(status_code = 200, content = {"message": "Welcome to the Insurance Premium Prediction API. Please use the /predict endpoint to get predictions."})

@app.get('/health')
def health_check():
    return{"status": "ok",
           "version": MODEL_VERSION,
           "model": model is not None}


@app.post('/predict')
def prediction_model(data: user_validation):
    user_input = ([
        {
            "income_lpa": data.income_lpa,
            "occupation": data.occupation,
            "age": data.age_group,
            "bmi": data.bmi,
            "lifestyle_risk": data.lifestyle_risk,
            "city": data.city_tier
        
        }
    ]
    )
    try:
        prediction = predict_output(user_input[0])
        return JSONResponse(status_code = 200, content = {"predicted_category": prediction})

    except Exception as e:
        return JSONResponse(status_code = 500, content = {"error": str(e)})
  

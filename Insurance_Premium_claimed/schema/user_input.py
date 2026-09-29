from pydantic import BaseModel, Field, computed_field
from typing import Literal, Annotated
from config.tier_city import tier_1_cities, tier_2_cities

class user_validation(BaseModel):
    age: Annotated[int, Field(..., gt = 0, lt= 120, description = 'Age of the user')]
    weight: Annotated[float, Field(..., gt = 0, description = 'weight of the user in kgs')]
    height: Annotated[float, Field(..., gt = 0, description = 'height of the user')]
    income_lpa:  Annotated[float, Field(..., gt = 0,  description = 'income of the user in lpa')]
    smoker:  Annotated[bool, Field(..., description = 'check wheather user is smoker or no')]
    city: Annotated[str, Field(..., description = 'city of the user', examples = ["Lahore"])]
    occupation: Annotated[Literal['retired','freelancer','student', 'government_job','business_owner','unemployed','private_job'], 
                Field(..., description = 'Occupation of the user')]

    @computed_field
    @property

    def age_group(self) -> str:
        if self.age < 25:
            return "young"
        elif self.age < 45:
            return "adult"
        elif self.age < 60:
            return "middle_age"
        else:
            return "senior"

    @computed_field
    @property
    def bmi(self)-> float:
        return (self.weight) / (self.height) **2
 
    @computed_field
    @property
    def lifestyle_risk(self) -> str:
        if self.smoker and self.bmi > 30:
            return "high"
        elif self.smoker and self.bmi > 27:
            return "medium"
        else:
            return "low"


    @computed_field
    @property
    def city_tier(self) -> int:
        if self.city in tier_1_cities:
            return 1
        elif self.city in tier_2_cities:
            return 2
        else: 
            return 3
from fastapi import Depends, FastAPI,HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from helpers.pass_encryp import verify_password, get_password_hash, get_user, authenticate_user, create_access_token, get_current_user, get_current_active_user

SECRET_KEY = "01f615901e42ce4451cdb67c9fbb367f5058405c00b3580b3caf3f884a7e9b7a"
ALGORITHM= "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
db = {
    "shahid": {
    "username":"shahid",
    "full_name":"Sk Shahid",
    "Roll":30,
    "email":"skshahid4467@gmail.com",
    "hashed_password":"$2b$12$kdKEZEFWp00yQLyUN0ad4uzWpRY7GSssyP4yoWZ8sL0ACj4kmWT96",
    "disabled":False
    }
}

class Token(BaseModel):
    access_token:str
    token_type:str


class User(BaseModel):
    username:str
    email:str or None = None
    full_name:str or None = None
    disabled:bool or None = None


app= FastAPI()

# Route: /token
# Method: POST
# Description: authenticates user and returns an access token
# Request Body: OAuth2PasswordRequestForm (username and password)
# Response: token (access_token and token_type)

@app.post("/token", response_model= Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user= authenticate_user(db, form_data.username,form_data.password)
    if not user:
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, 
                            detail= "Incorrect UserName or password",
                             headers={"WWW-Authenticate":"Bearer"})
    access_token_expires= timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token= create_access_token(data={"sub":user.username}, expires_delta=access_token_expires)
    return{"access_token":access_token, "token_type":"bearer"}


# Route: /user/me/
# Method: GET
# Description: retrieves current authenticated user's information
# Response: user (username, email, full_name, disabled)

@app.get("/user/me/", response_model= User)
async def read_user_name(current_user: User = Depends(get_current_active_user)):
    return current_user


# Route: /user/me/items
# Method: GET
# Description: retrieves items owned by the current authenticated user
# Response: list of items

@app.get("/user/me/items")
async def read_own_itesm(current_user: User = Depends(get_current_active_user)):
    return [{"item_id":1, "owner":current_user}]

# pwd= get_password_hash("ge@4467")
# print(pwd)

##Make a resgiter route to accept the username,password and store the hashed password and other information in DB
# class Data(BaseModel):
#     name:str
#     age:int
#     roll:int



# @app.post("/create/")
# async def create(data:Data):
#     return {"data":data,
#             "bmi":data.age+data.roll}


# @app.get("/test/{item_id}/")
# async def test(item_id: str , query : int):
#     return{"hello":item_id}
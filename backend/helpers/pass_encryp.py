from fastapi import Depends, FastAPI,HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional

SECRET_KEY = "01f615901e42ce4451cdb67c9fbb367f5058405c00b3580b3caf3f884a7e9b7a"
ALGORITHM= "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30

db = {
    "shahid": {
    "username":"shahid",
    "full_name":"Sk Shahid",
    # "Roll":30,
    "email":"skshahid4467@gmail.com",
    "hashed_password":"$2b$12$kdKEZEFWp00yQLyUN0ad4uzWpRY7GSssyP4yoWZ8sL0ACj4kmWT96",
    "disabled":False
    }
}


class TokenData(BaseModel):
    username: Optional[str]= None

class User(BaseModel):
    username:str
    email:Optional[str] = None
    full_name:Optional[str] = None
    disabled:Optional[bool] = None

class UserInDB(User):
    hashed_password:str 


pwd_context = CryptContext(schemes= ["bcrypt"], deprecated="auto")
oauth_2_scheme = OAuth2PasswordBearer(tokenUrl= "token")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(db, username:str):
    if username in db:
        user_data = db[username]
        return UserInDB(**user_data)


def authenticate_user(db,username:str, password:str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password,user.hashed_password):
        return False

    return user

def create_access_token(data:dict, expires_delta: Optional[timedelta]= None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt= jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token:str = Depends(oauth_2_scheme)): #depends upon the oauthscheme to parse the token
    credential_exception= HTTPException(status_code= status.HTTP_401_UNAUTHORIZED,
                                        detail= "Could not validate user credentials",
                                        headers={"WWW-Authenticate":"Bearer"})
    try:
        payload= jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) #decode the token
        username: str = payload.get("sub") #check the user name from the token 
        if username is None:
            raise credential_exception
        token_data= TokenData(username= username)

    except JWTError:
        raise credential_exception
    
    user= get_user(db, username= token_data.username) #Check if user is in DB
    if user is None:
        raise credential_exception
    return user

async def get_current_active_user(current_user:UserInDB= Depends(get_current_user)): #depends upon get_curent user func
    if current_user.disabled:
        raise HTTPException(status_code= 400, detail= "User No longer exists")
    
    return current_user



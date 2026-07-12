import pymysql
from config import Config

def get_connection():
    return pymysql.connect(
        host=Config.HOST,
        user=Config.USER,
        password=Config.PASSWORD,
        database=Config.DATABASE,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )
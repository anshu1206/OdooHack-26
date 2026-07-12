CREATE DATABASE transitops_db;

USE transitops_db;

CREATE TABLE users(

id INT PRIMARY KEY AUTO_INCREMENT,

name VARCHAR(100),

email VARCHAR(100),

password VARCHAR(100),

role VARCHAR(50)

);

INSERT INTO users(name,email,password,role)

VALUES

('Fleet Manager','fleet@transitops.com','123','Fleet Manager'),

('Dispatcher','dispatcher@transitops.com','123','Dispatcher'),

('Safety Officer','safety@transitops.com','123','Safety Officer'),

('Financial Analyst','finance@transitops.com','123','Financial Analyst');
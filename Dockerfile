FROM node:12
WORKDIR /opt/r2py
COPY . .
RUN npm install


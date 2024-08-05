FROM node
ENV DOCKERVERSION=26.1.4
COPY . /app
WORKDIR '/app'
CMD ["/bin/bash", "-c", "npm i ts-node typescript; npm install; npm start;"]

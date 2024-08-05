FROM haugene/transmission-openvpn
ENV DOCKERVERSION=26.1.4
WORKDIR /app
RUN apt-get update
RUN apt-get -y install curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_20.x  | bash -
RUN apt-get -y install nodejs
COPY . /app
RUN npm install express --save
RUN chmod +x /app/start.sh
expose 4010
CMD ["dumb-init", "/app/start.sh"]
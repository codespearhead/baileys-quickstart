FROM node:19.5-buster

WORKDIR /build
ADD https://github.com/Paguiar735/baileys-quickstart/archive/refs/heads/main.tar.gz main.tar.gz
RUN tar --strip-components=1 -xvf main.tar.gz
RUN rm -rf main.tar.gz
RUN npm i
RUN npm run build

ENTRYPOINT ["npm", "start"]
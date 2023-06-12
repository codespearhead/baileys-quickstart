FROM node:18.14-alpine3.17

RUN wget -O /usr/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_x86_64
RUN chmod +x /usr/bin/dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

WORKDIR /build
ADD https://github.com/codespearhead/baileys-quickstart/archive/refs/heads/main.tar.gz main.tar.gz
RUN tar --strip-components=1 -xvf main.tar.gz
RUN rm -rf main.tar.gz
RUN npm i
RUN npm run build

CMD ["npm", "start"]
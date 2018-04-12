FROM node:9-alpine
LABEL maintainer "Andy Savage"

ENV NPM_CONFIG_LOGLEVEL info
ENV TZ 'Asia/Hong_Kong'
ENV NODE_ENV 'development'
ENV WATCHMAN_VERSION '4.9.0'
ENV WATCHMAN_REPO 'https://github.com/facebook/watchman.git'

# RUN install_packages libssl-dev pkg-config libtool curl ca-certificates build-essential autoconf python-dev libpython-dev autotools-dev automake && \
#     curl -LO https://github.com/facebook/watchman/archive/v${WATCHMAN_VERSION}.tar.gz && \
#     tar xzf v${WATCHMAN_VERSION}.tar.gz && rm v${WATCHMAN_VERSION}.tar.gz && \
#     cd watchman-${WATCHMAN_VERSION} && ./autogen.sh && ./configure && make && make install && \
#     apt-get purge -y pkg-config curl ca-certificates build-essential autoconf python-dev libpython-dev autotools-dev automake libtool && \
#     cd /tmp && rm -rf watchman-${WATCHMAN_VERSION}

VOLUME ["/data", "/config"]

COPY . /app
WORKDIR /app

RUN apk update \
 && apk add --no-cache \
  git build-base automake autoconf libtool openssl-dev \
  linux-headers ca-certificates tzdata curl \
  libc6-compat \
  nano \
  tini \
  bash \
 && cp "/usr/share/zoneinfo/${TZ}" /etc/localtime \
 && echo "${TZ}" >  /etc/timezone \
 # Install Watchman
 && git clone "$WATCHMAN_REPO" /tmp/watchman-src \
 && cd /tmp/watchman-src \
 && git checkout -q "v${WATCHMAN_VERSION}"
 # && ./autogen.sh \
 # && ./configure --enable-statedir=/tmp --without-python --with-buildinfo="Built in Alpine Dockerfile" \
 # && make \
 # && make install \
 # clean up dependencies
 # && apk del --purge \
 #  git build-base automake autoconf libtool openssl-dev \
 #  linux-headers ca-certificates tzdata curl \
 # && rm -rf /var/cache/apk/ \
 # && rm -r /tmp/watchman-src

ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "/bin/bash" ]

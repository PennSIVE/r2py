FROM r-base
WORKDIR /opt/r2py
RUN apt update && apt install -y git curl ssh-client && Rscript -e "install.packages(c('Rdpack', 'desc'))"
COPY . .
ENTRYPOINT [ "./run.sh" ]

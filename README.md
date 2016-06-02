
1. install django

    pip install django
2. install mycli

    pip install mycli
3. install uwsgi

    pip install uwsgi
4. start up server

    cd ./
    /usr/local/bin/uwsgi --http :9090 --wsgi-file django_wsgi.py --touch-reload /tmp/touch --http-websockets
5. visit `http://localhost:9090/mycli`
6. enter your mysql's ip,port,username and password ,`click Connect`
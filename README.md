## Quickstarts

1. install django

        pip install django
    
2. install mycli

        pip install mycli
3. install uwsgi

        pip install uwsgi
4. start up server

        uwsgi --http :9090 --wsgi-file django_wsgi.py --http-websockets
5. visit `http://localhost:9090/mycli` on your browser
6. enter your mysql's ip,port,username and password ,click `Connect`

## Example

![](/doc/mycli_example0.png)
![](/doc/mycli_example1.png)
![](/doc/mycli_example2.png)


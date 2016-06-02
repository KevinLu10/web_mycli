import  os,sys
import  django.core.handlers.wsgi
os.environ['DJANGO_SETTINGS_MODULE']='web_mycli.settings'
application=django.core.handlers.wsgi.WSGIHandler()
 
# -*- coding: utf-8 -*-
from django.conf.urls import patterns, url
## django 自动处理静态文件， 在模板框中可直接通过 static/ 引用
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from views import mycli_page, mycli_websocket

urlpatterns = patterns('',
                       url(r'^mycli/?$', mycli_page),
                       url(r'^mycli_websocket/?$', mycli_websocket),
                       )
urlpatterns += staticfiles_urlpatterns()
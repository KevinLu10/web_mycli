# encoding=utf-8
__author__ = 'kevinlu1010@qq.com'
import traceback
from django.shortcuts import render_to_response, HttpResponse


def mycli_page(request):
    '''
    return html page
    '''
    return render_to_response('mycli.html')


def mycli_websocket(request):
    '''
    handle the websocke connection to browser
    '''
    try:
        from mycli_websocket import MycliHandler
        mycli_handler = MycliHandler()
        mycli_handler.run()
        return HttpResponse('websocket closed')
    except:
        print traceback.format_exc()
        return None


if __name__ == '__main__':
    pass

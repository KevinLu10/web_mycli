# encoding=utf-8
"""
mysql建立websocket
"""
import re
import traceback
import json
import logging
import ipaddress
from mycli_client import MycliClient
from datetime import datetime

log = logging.getLogger('mycli')


class InputChecker():
    '''
    check input msg is valid
    '''

    @staticmethod
    def is_ip(input_str):
        '''
        输入的内容是否是IP地址
        :param input_str:
        :return:
        '''
        if not isinstance(input_str, unicode):
            input_str = input_str.decode('utf-8')
        try:
            ipaddress.ip_address(input_str)
            return True
        except ValueError:
            return False



class ACTIONS():
    '''
    websocket actions
    '''
    INIT_CONNECT = 'INIT_CONNECT'
    CLOSE_CONNECT = 'CLOSE_CONNECT'
    RUN_QUERY = 'RUN_QUERY'
    ERROR = 'ERROR'
    GET_COMPLETER = 'GET_COMPLETER'


class MycliHandler():
    '''
    handle websocket connection from browser
    '''

    def __init__(self, max_limit=1000):
        #if process is not started by uwsgi
        # import uwsgi will raise a Error
        import uwsgi
        self.mysql_ip = None
        self.mysql_port = None
        self.ws_with_browser = uwsgi
        self.ws_with_browser.websocket_handshake()
        self.is_close = 0
        self.client_ip = ''
        self.db = ''
        # if lines length of  run query result bigger than max_limit
        # return first max_limit lines
        self.max_limit = max_limit
        self.mysql_username = None
        self.mysql_password = None
        self.mysql_access_type = None

    def run(self):
        log.error(1)
        while 1:
            if self.is_close:
                break
            try:
                log.error(2)
                msg = self.ws_with_browser.websocket_recv()
                log.error(3)
            except IOError, e:
                log.error(5)
                if str(e) == 'unable to receive websocket message':
                    self.close('')
                    break
                else:
                    raise
            try:
                msg = json.loads(msg)
            except ValueError:
                continue
            try:
                log.error(4)
                action = msg.get('action')
                if action == ACTIONS.INIT_CONNECT:
                    self.init_connect(msg)
                elif action == ACTIONS.RUN_QUERY:
                    self.run_query(msg)
                elif action == ACTIONS.GET_COMPLETER:
                    self.get_complete(msg)
                elif action == ACTIONS.CLOSE_CONNECT:
                    self.close(msg)
            except (SystemExit):
                print traceback.format_exc()

        return


    def init_connect(self, msg):
        '''
        init connection
        :return:
        '''

        data = json.loads(msg.get('data'))  # 连接到的mysql ip
        self.mysql_ip = data['mysql_ip']
        self.mysql_port = data['mysql_port']
        self.mysql_username = data['mysql_user']
        self.mysql_password = data['mysql_pwd']
        log.error(1)
        msg['mysql_username'] = self.mysql_username
        try:
            self.mysql_client = MycliClient(self.mysql_ip,
                                            self.mysql_port,
                                            '',
                                            self.mysql_username,
                                            self.mysql_password)
            self.mysql_client.connect()
            msg['data'] = 'ok'
            log.info('init connection to MySQL[%s] success', self.mysql_ip)
            self.send(msg)
        except Exception, e:
            msg['data'] = 'connect to %s fail;reason:[%s]' % (self.mysql_ip, str(e))
            log.error('init connection to MySQL[%s] success.reason:[%s]' , self.mysql_ip, str(e))
            self.send(msg)
            self.close(msg)

    def run_query(self, msg):
        '''
        run a sql query
        :return:str
        '''
        log.debug('start run query')
        # 把query记录到数据库
        query = msg.get('data')
        use_result = self.get_query_db(query)
        query = self.add_limit_to_sql(query)
        log.debug('query:%s' % query)
        try:
            run_result, status = self.mysql_client.run_query(query)
            msg['data'] = dict(result='ok', data=self.mysql_client.fomat_run_result(run_result) + '\n%s' % str(status))
            log.info('run query [%s] success' , query)
            is_suc = 1
        except Exception, e:
            log.error('run query [%s] fail' , query)
            msg['data'] = dict(result='error', data=str(e))
            is_suc = 0
        if use_result and is_suc:
            msg['db'] = self.db

        log.debug('save audit done')
        self.send(msg)

    def get_complete(self, msg):
        '''
        get completer msg and send to client
        :param msg:data from client
        :return:None
        '''
        completions = self.mysql_client.get_completions(msg.get('data'), msg.get('cursor_position'))
        msg['data'] = completions

        self.send(msg)

    def close(self, msg):
        '''
        close connection
        :param msg: data from client
        :return: None
        '''
        self.is_close = 1
        self.ws_with_browser.close(1)
        log.info('connection to Mysql[%s] disconnect', self.mysql_ip)

    def send(self, msg):
        '''
        send data to client
        :param msg:data from client
        :return: None
        '''
        self.ws_with_browser.websocket_send(json.dumps(msg))

    def get_query_db(self, query):
        '''
        if the query is a query to select database,get thie database name
        :param query:
        :return:1 if query is a select database query or 0
        '''
        if query.upper().strip().startswith('USE '):
            db = query[4:]
            self.db = db.split(';')[0]
            return 1
        return 0

    def add_limit_to_sql(self, sql):
        '''
        add limit statement to sql
        :param sql:sql from user
        :return:sql
        '''
        max_limit = self.max_limit

        def repl_two_limit(match_obj):
            sub_sql = match_obj.group(0)
            raw_sql = re.search('limit +(\d+) *, *(\d+)', sub_sql).group(0)
            replaced_sql = re.sub('\d+$', str(max_limit), raw_sql)
            replaced_sub_sql = sub_sql.replace(raw_sql, replaced_sql, 1)
            return replaced_sub_sql

        def repl_one_limit(match_obj):
            sub_sql = match_obj.group(0)
            raw_sql = re.search('limit +(\d+)[^)]', sub_sql).group(0)
            replaced_sql = re.sub('\d+$', str(max_limit), raw_sql)
            replaced_sub_sql = sub_sql.replace(raw_sql, replaced_sql, 1)
            return replaced_sub_sql

        if sql.lower().strip().startswith('select'):
            # 匹配 limit 1,2这种类型的
            regx = 'limit +(\d+) *, *(\d+)[^)\'"]*$'
            two_limit = re.findall(regx, sql)
            if len(two_limit) == 1:
                index, length = two_limit[0]
                if int(length) > max_limit:
                    sql = re.sub(regx, repl_two_limit, sql, 1)
                return sql
            # 匹配 limit 23 这种类型的
            regx = 'limit +(\d+)[^)\'"]*$'
            one_limit = re.findall(regx, sql)
            if len(one_limit) == 1:
                length = one_limit[0]
                if int(length) > max_limit:
                    sql = re.sub(regx, repl_one_limit, sql, 1)
                return sql

            # 直接在后面添加
            limit_str = ' limit %d ' % max_limit
            try:
                index = sql.index('\\G')
            except:
                try:
                    index = sql.index(';')
                except:
                    index = len(sql)

            sql = sql[0:index] + limit_str + sql[index:]

        return sql


if __name__ == '__main__':
    pass

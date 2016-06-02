# encoding=utf-8
__author__ = 'kevinlu1010@qq.com'
from prettytable import PrettyTable
from mycli import main


class MycliClient():
    '''
    client to mycli
    '''

    def __init__(self, server_ip, port, db, username, password):
        '''
        :param server_ip:mysql ip
        :param port: mysql port
        :param db: mysql db
        :param username: mysql username
        :param password: mysql password
        :return:
        '''
        self.server_ip = server_ip
        self.port = port
        self.db = db
        self.username = username
        self.passowrd = password
        self.mycli_client = None

    def connect(self):
        '''
        init connection to Mycli
        :return:
        '''

        self.mycli_client = main.MyCli()
        self.mycli_client.connect(self.db, self.username, self.passowrd, self.server_ip, self.port)
        self.mycli_client.initialize_completions()
        self.mycli_client.completer.smart_completion = True

    def run_query(self, query):
        '''
        run mysql query
        :param query:str sql
        :return:tuple
        '''
        res = self.mycli_client.sqlexecute.run(query)
        for title, cur, headers, status in res:
            result = []
            if cur:
                result = list(cur.fetchall())
            if headers:
                result.insert(0, headers)
            if result == []:
                result = ''
            return result, status

    def get_completions(self, query, cursor_position):
        '''
        through mycli,get complete msg
        :param query:the sql fragment  entered by user
        :param cursor_position:the input cursor position
        :return:list conpleteions
        '''
        if isinstance(query, str):
            query = query.decode('utf-8')

        self.mycli_client.refresh_dynamic_completions()
        completions = self.mycli_client.get_completions(query, cursor_position)
        return [dict(text=c.text, start_position=c.start_position) for c in completions]

    def fomat_run_result(self, result):
        '''
        use prettytable to format run query result
        :param result:[tuple]
        :return:str
        '''
        rows = result
        rows_len = [len(row) for row in rows]
        if len(set(rows_len)) == 1:
            pretty_table = PrettyTable(rows[0])
            for i in range(1, len(rows)):
                pretty_table.add_row(rows[i])
            return str(pretty_table)
        return str(result)


if __name__ == '__main__':
    pass
    # c = MysqlConnClient('192.168.8.1', '', 'msalt_mycli', 'ur_passwd')
    # c.get_completions('sel

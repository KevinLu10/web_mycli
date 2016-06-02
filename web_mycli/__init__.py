import logging
def allot_logger(name, filename, level=None, format=None):
    '''
    init a logger
    :return:
    '''
    if level == None:
        level = logging.DEBUG
    if format == None:
        format = '%(asctime)s %(levelname)s %(module)s.%(funcName)s Line:%(lineno)d %(message)s'
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(level)
    handler = logging.FileHandler(filename)
    handler.setFormatter(
        logging.Formatter(format))
    logger.handlers = [handler]

#config mycli logger
allot_logger('mycli','/var/logs/mycli.log')

class Log:

    def __init__(self, app):
        self.app = app

    def error(self, s):
        self.app.logger.error(s)

    def info(self, s):
        self.app.logger.info(s)

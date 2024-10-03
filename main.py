import os
import decky

class Plugin:
    async def getDeckyUserHome(self):
        return decky.DECKY_USER_HOME
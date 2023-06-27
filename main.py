import os
import decky_plugin

class Plugin:
    async def getDeckyUserHome(self):
        return decky_plugin.DECKY_USER_HOME
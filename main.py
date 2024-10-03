import os
import decky

class Plugin:
    async def getDeckyUserHome(self):
        return decky.DECKY_USER_HOME
    async def _main(self):
        pass
    async def _unload(self):
        pass
    async def _uninstall(self):
        pass
    async def _migration(self):
        pass
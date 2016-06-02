#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    module_dir = os.path.join(os.path.abspath(os.path.join(os.path.dirname("__file__"),"..")), 'packages').replace('\\','/')
    sys.path.insert(0, module_dir)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "web_mycli.settings")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)

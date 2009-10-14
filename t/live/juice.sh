#!/bin/bash
cd ../..
export DYLD_LIBRARY_PATH=~/code/js/mozjs_debug/lib:~/code/js/flusspferd/build/default/src
export DYLD_FRAMEWORK_PATH=~/Library/Frameworks
exec /usr/local/bin/flusspferd -I ~/code/js/template/lib -I lib $@

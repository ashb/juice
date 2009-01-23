#!/bin/bash
cd ../..
export DYLD_LIBRARY_PATH=~/code/js/mozjs_debug/lib:~/code/js/flusspferd/build/default/src
export DYLD_FRAMEWORK_PATH=~/Library/Frameworks
exec /Users/ash/code/js/flusspferd_install/bin/flusspferd $@

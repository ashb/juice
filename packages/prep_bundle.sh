#!/bin/bash

so="dylib"
dest="$1"

# Output dirs
mkdir -p "$dest/bin" "$dest/lib/flusspferd" "$dest/etc/flusspferd" \
         "$dest/include/flusspferd" \
         "$dest/include/js" \
         "$dest/share/man/man1"

cp -R /usr/local/bin/flusspferd "$dest/bin/flusspferd"
cp -R /usr/local/etc/flusspferd/ "$dest/etc/flusspferd"
cp -R /usr/local/lib/flusspferd/ "$dest/lib/flusspferd"
cp -R /usr/local/lib/libflusspferd.$so "$dest/lib/"
cp -R /usr/local/include/flusspferd* "$dest/include"

cp -R /usr/local/share/man/man1/flusspferd* "$dest/share/man/man1"

our_bin="$dest/bin/flusspferd"
our_lib="$dest/lib/libflusspferd.dylib"
bin_to_lib="@executable_path/../lib"
# Fix up links for bin/flusspferd
install_name_tool \
  -change libflusspferd.dylib \
          "$bin_to_lib/libflusspferd.dylib" \
          "$our_bin"

# Fix up links for lib/libflusspferd.dylib
install_name_tool \
  -change @executable_path/libmozjs.dylib \
          "$bin_to_lib/libmozjs.dylib" \
          "$our_lib"

# Boost libs.
for lib in libboost_thread-xgcc40-mt-1_37.dylib \
           libboost_filesystem-xgcc40-mt-1_37.dylib \
           libboost_system-xgcc40-mt-1_37.dylib
do
  install_name_tool -change "$lib" "$bin_to_lib/$lib" "$our_bin"
  cp /usr/local/lib/$lib "$dest/lib"
done

# Zest
if [ -n "$zest" ]; then
  cp "$zest/build/libzest.$so" "$dest/lib/flusspferd/modules"
fi

# Juice
if [ -n "$juice" ]; then
  cp -R "$juice/lib/" "$dest/lib/flusspferd/modules"
  cp -R "$juice/bin/" "$dest/bin"
fi


if [ -n "$template" ]; then
  cp -R "$template/lib/" "$dest/lib/flusspferd/modules"
fi


if [ -n "$js" ]; then
  cp -R $js/include/js "$dest/include"
  cp -R $js/lib/libmozjs.$so "$dest/lib"
fi

echo Building Juice.mpkg...
juice_ver=0.1
freeze Juice/Juice.packproj

echo Building Juice-0.1.dmg...
hdiutil create -fs HFS+ -srcfolder Juice/build/ -volname "Juice $juice_ver" Juice-$juice_ver.dmg \
  && sudo rm -r Juice/build
echo done!


#!/bin/bash

# Array of libs copied
declare -a copied

function already_copied()
{

  if [ -z "$1" ]; then
    return 0
  fi

  for i in ${copied[@]}; do
    if [ $i == $1 ]; then
      return 0
    fi
  done

  return 1
}


function pull_in_libs() {
  local file=$1;
  local lines=${2:-1,2}

  echo "Pulling in deps for '$file'"
  #echo "stripping $lines lines from otool -L $file"
  #echo "otool -L \"$file\"  | sed \"${lines}d\" | awk '/\/usr\/lib\// {next} {print \$1}'"
  #echo "$(otool -L "$file"  | sed "${lines}d" | awk '/\/usr\/lib\// {next} {print $1}')"
  #echo
  for lib in $(otool -L "$file"  | sed "${lines}d" | awk '/\/usr\/lib\// {next} {print $1}')
  do
    if [ "$lib" == "$our_libname" ]; then
        install_name_tool -change "$lib" "$bin_to_lib/$lib" "$file"
    else
      libfile=$(basename $lib)
      #echo "libfile=$libfile lib=$lib file=$file"
      if ! [ -e "$dest/lib/$libfile" ] && [ -e $lib ]; then
        #echo "copying '$lib' to '$dest/lib/$libfile'"
        cp -R "$lib" "$dest/lib/$libfile"
      fi

      if ! already_copied "$libfile" && [ -e "$dest/lib/$libfile" ]; then
        #echo install_name_tool -change "$lib" "$bin_to_lib/$libfile" "$file"
        install_name_tool -change "$lib" "$bin_to_lib/$libfile" "$file"
        copied[${#copied[@]}]="$libfile"
        pull_in_libs "$dest/lib/$libfile"
      fi
    fi
  done
}

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
our_libname="libflusspferd.dylib"
our_lib="$dest/lib/$our_libname"
bin_to_lib="@executable_path/../lib"
module_dir="$dest/lib/flusspferd/modules"

pull_in_libs "$our_bin" 1
pull_in_libs "$our_lib"

# Fix up links for lib/libflusspferd.dylib
install_name_tool \
  -change @executable_path/libmozjs.dylib \
          "$bin_to_lib/libmozjs.dylib" \
          "$our_lib"


# Zest
if [ -n "$zest" ]; then
  cp "$zest/build/libzest.$so" "$module_dir"
fi

# Juice
if [ -n "$juice" ]; then
  cp -R "$juice/lib/" "$module_dir"
  cp -R "$juice/bin/" "$dest/bin"
fi


if [ -n "$template" ]; then
  cp -R "$template/lib/" "$dest/lib/flusspferd/modules"
fi


if [ -n "$js" ]; then
  cp -R $js/include/js "$dest/include"
  cp -R $js/lib/libmozjs.$so "$dest/lib"
fi

find "$dest" -name .\*.sw[op] -print0 | xargs -0 rm
  
for file in $(find "$module_dir" -name \*.dylib); do
  pull_in_libs "$file"
done

echo -e "\nSanity check\n"

DYLD_LIBRARY_PATH= DYLD_PRINT_LIBRARIES=1 bin/flusspferd -Msqlite3 -Mzest -e1 2>&1 | grep -v ' /System' | grep -v ' /usr/lib/'
DYLD_LIBRARY_PATH= bin/flusspferd -v


echo Building Juice.mpkg...
juice_ver=0.1
freeze Juice/Juice.packproj

echo Building Juice-$juice_ver.dmg...
rm Juice-$juice_ver.dmg
hdiutil create -fs HFS+ -srcfolder Juice/build/ -volname "Juice $juice_ver" Juice-$juice_ver.dmg \
  && sudo rm -r Juice/build
echo done!


#!/bin/bash

# rm -r bin/ lib/ etc/ include/; bash prep_bundle.sh -j js=~/code/js/mozjs_release-4.2/ -d . .. ../../Zest ../../http-fetch ../../Template

set -e

declare -a copied # Array of libs copied
declare -a to_install # Array of modules to install

make_bundle=1
while [ $# -gt 0 ]; do
  case "$1" in
    --no-bundle)
      make_bundle=0
      shift
      ;;
    -s)
      js=$2
      [ $# -ge 2 ] || { echo missing argument after -s 1>&2; exit 1; }
      shift 2;
      ;;
    --spidermonkey=*)
      js=${1#--spidermonkey=}
      shift
      ;;
    -d)
      dest=$2
      [ $# -ge 2 ] || { echo missing argument after -d 1>&2; exit 1; }
      shift 2;
      ;;
    --dest=*)
      dest=${1#--dest=}
      shift
      ;;
    -*)
      echo unknown argument $1 1>&2;
      exit 2;
      ;;
    *)
      # All remaining args are either dirs or paths to install.js
      while [ $# -gt 0 ]; do
        case "$1" in
          */install.js|install.js)
            [ -f "$1" ] || { echo "$1 not found" 1>&2; exit 1; }
            to_install[${#to_install[@]}]="$1"
            shift
            ;;
          *)
            i="$1/install.js"
            [ -f "$i" ] || { echo "$i not found" 1>&2; exit 1; }
            to_install[${#to_install[@]}]="$i"
            shift
            ;;
        esac
      done
  esac
done

[ -n "$dest" ] || { echo No dest option provided! 1>&2; exit 1; }
[ -n "$js" ] || { echo No spidermonkey option provided! 1>&2; exit 1; }
[ -f "$js/lib/libmozjs.dylib" ] || { echo "Can't find libmozjs.dylib under $js/lib" 1>&2; exit 1; }

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

  #echo "Pulling in deps for '$file'"
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

      install_name_tool -change "$lib" "$bin_to_lib/$libfile" "$file"
      if ! already_copied "$libfile" && [ -e "$dest/lib/$libfile" ]; then
        #echo install_name_tool -change "$lib" "$bin_to_lib/$libfile" "$file"
        copied[${#copied[@]}]="$libfile"
        pull_in_libs "$dest/lib/$libfile"
      fi
    fi
  done
}

so="dylib"

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

cp -R $js/include/js "$dest/include"
cp -R $js/lib/libmozjs.$so "$dest/lib"

# Fix up links for lib/libflusspferd.dylib
install_name_tool \
  -change @executable_path/libmozjs.dylib \
          "$bin_to_lib/libmozjs.dylib" \
          "$our_lib"


for i in ${to_install[@]}; do
  "$our_bin" "$i"
done

find "$dest" -name .\*.sw[op] -print0 | xargs -0 rm
 
# We're still building some libs wrong it seems.
for file in $(find "$module_dir" -name \*.dylib); do
  pull_in_libs "$file"
done

echo -e "\nSanity check\n"

# List of modules that Juice uses. Here until we end up with a proper way of
# specifying deps

output=$(
    DYLD_LIBRARY_PATH= DYLD_PRINT_LIBRARIES=1 \
    bin/flusspferd \
    -Msqlite3 \
    -Mzest \
    -MTemplate \
    -MJuice \
    -Mhttp-fetch \
    -e1 2>&1) || { echo $output | grep -v 'dyld: loaded:'; exit 1; }

echo "$output" | grep 'dyld: loaded:' | grep -v ' /System' | grep -v ' /usr/lib/'
DYLD_LIBRARY_PATH= bin/flusspferd -v

[ $make_bundle -eq 0 ] && exit 0

echo Building Juice.mpkg...
juice_ver=0.1
freeze Juice/Juice.packproj

echo Building Juice-$juice_ver.dmg...
[ -e Juice-$juice_ver.dmg ] && rm Juice-$juice_ver.dmg
hdiutil create -fs HFS+ -srcfolder Juice/build/ -volname "Juice $juice_ver" Juice-$juice_ver.dmg \
  && sudo rm -r Juice/build
echo done!


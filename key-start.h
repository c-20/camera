#if 0
runpid="$(ps -e | grep 'run' | sed 's/ .*$//')"
[ "$runpid" != "" ] && echo "runpid $runpid exists" && return
[ -e "run.kgo" ] && echo "run.kgo file exists" && return
./run >web-access.txt 2>web-errors.txt &
jobs
runpid="$(ps -e | grep 'run' | sed 's/ .*$//')"
echo "runpid is $runpid"
# disown -h %1
jobs
kill -CONT $runpid
jobs
echo "delete run.kgo to stop"
return
#endif

// start a background process
// if it can't write to stdout it will hang
// disown to prevent SIGHUP on terminal close


param([Parameter(ValueFromRemainingArguments=$true)][string[]]$ExtraArgs)
$ScriptDir=Split-Path -Parent $MyInvocation.MyCommand.Path
& node (Join-Path $ScriptDir '../packages/cli/index.mjs') install-skills @ExtraArgs
exit $LASTEXITCODE

$key = "C:\Users\ahmad\Downloads\cega-webb\terraform\server-web.pem"
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

icacls $key /inheritance:r
icacls $key /remove "A-LOQ-OF-NERD\CodexSandboxUsers"
icacls $key /grant:r "${me}:(R)"

ssh -i $key ubuntu@13.204.210.211
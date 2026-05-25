$ErrorActionPreference = "Stop"

$rawDir = "datasets/raw"
$outDir = "datasets/processed"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$ibmPath = Join-Path $rawDir "ibm_hr_attrition.csv"
$hrPath = Join-Path $rawDir "hr_comma_sep.csv"

if (!(Test-Path $ibmPath)) {
  throw "Missing file: $ibmPath"
}
if (!(Test-Path $hrPath)) {
  throw "Missing file: $hrPath"
}

# Synthetic but realistic identity pools for demo-safe HR profiles.
$firstNames = @(
  "Aarav","Olivia","Noah","Emma","Liam","Sophia","Mason","Isabella","Lucas","Mia",
  "Ethan","Amelia","James","Harper","Benjamin","Evelyn","Elijah","Abigail","Daniel","Ella"
)
$lastNames = @(
  "Parker","Reed","Patel","Kim","Brooks","Diaz","Singh","Martinez","Walker","Evans",
  "Lopez","Hughes","Torres","Bennett","Ramirez","Shaw","Cruz","Powell","Murphy","Hayes"
)
$companies = @(
  "TechNova Labs","Vertex Dynamics","BlueOrbit Systems","Pioneer Analytics","NorthBridge AI",
  "Helios Software","Nimbus Digital","Apex BioData","PulseWorks","Catalyst Cloud"
)

function Get-ProfileName {
  param([int]$seed)
  $first = $firstNames[$seed % $firstNames.Count]
  $last = $lastNames[([math]::Floor($seed / $firstNames.Count)) % $lastNames.Count]
  return "$first $last"
}

function Get-FieldValue {
  param(
    [object]$row,
    [string[]]$names
  )
  foreach ($n in $names) {
    $prop = $row.PSObject.Properties | Where-Object { $_.Name -ieq $n } | Select-Object -First 1
    if ($null -ne $prop) {
      $val = ($prop.Value + "").Trim()
      if (![string]::IsNullOrWhiteSpace($val)) {
        return $val
      }
    }
  }
  return ""
}

function Get-RoleSkills {
  param([string]$role)
  $map = @{
    "Sales Executive"      = @("Negotiation","Account Strategy","CRM","Pipeline Forecasting")
    "Research Scientist"   = @("Statistical Modeling","Python","Experimental Design","Data Analysis")
    "Laboratory Technician"= @("Quality Control","Lab Operations","Documentation","Safety Compliance")
    "Manufacturing Director" = @("Lean Manufacturing","Process Optimization","Leadership","Root Cause Analysis")
    "Healthcare Representative" = @("Stakeholder Communication","Compliance","Client Education","Territory Planning")
    "Human Resources"      = @("Employee Relations","Workforce Planning","Performance Management","Conflict Resolution")
    "Manager"              = @("Leadership","Project Planning","Risk Management","People Development")
    "Research Director"    = @("R&D Strategy","Cross-Functional Leadership","Innovation Planning","Budgeting")
  }
  if ($map.ContainsKey($role)) { return $map[$role] }
  return @("Communication","Problem Solving","Collaboration","Execution")
}

# 1) Employees from IBM attrition dataset
$ibm = Import-Csv $ibmPath
$employeeSkills = @()
$employeeExperience = @()
$employees = foreach ($row in $ibm) {
  $id = $row.EmployeeNumber
  if ([string]::IsNullOrWhiteSpace($id)) { continue }

  $sentiment = 0.5
  if ($row.JobSatisfaction) {
    $sentiment = [math]::Round(([double]$row.JobSatisfaction / 4.0), 2)
  }
  $retention = 0.6
  if ($row.EnvironmentSatisfaction) {
    $retention = [math]::Round(([double]$row.EnvironmentSatisfaction / 4.0), 2)
  }
  $atRisk = if (($row.Attrition + "").ToLower() -eq "yes") { "true" } else { "false" }
  $profileName = Get-ProfileName -seed ([int]$id)
  $emailBase = (($profileName -replace '\s+','.' -replace '[^a-zA-Z\.]','').ToLower())
  $email = "$emailBase.emp$id@public.local"
  $skills = Get-RoleSkills -role $row.JobRole
  $skillBase = if ($row.JobLevel) { [int]$row.JobLevel } else { 2 }
  foreach ($s in $skills) {
    $level = [math]::Max(1, [math]::Min(5, $skillBase + (Get-Random -Minimum -1 -Maximum 2)))
    $employeeSkills += [pscustomobject]@{
      email = $email
      skill_name = $s
      level = $level
    }
  }
  $years = if ($row.TotalWorkingYears) { [double]$row.TotalWorkingYears } else { [double](Get-Random -Minimum 2 -Maximum 15) }
  $tenure = if ($row.YearsAtCompany) { [double]$row.YearsAtCompany } else { [double](Get-Random -Minimum 1 -Maximum 8) }
  $employeeExperience += [pscustomobject]@{
    email = $email
    company = $companies[[int]$id % $companies.Count]
    position = $row.JobRole
    duration_years = [math]::Round($years, 1)
    description = "Delivered impact in $($row.Department), with internal tenure of $tenure years."
  }

  [pscustomobject]@{
    full_name       = $profileName
    email           = $email
    department      = $row.Department
    role            = $row.JobRole
    sentiment_score = $sentiment
    is_at_risk      = $atRisk
    retention_prob  = $retention
  }
}
$employeesPath = Join-Path $outDir "employees_public.csv"
$employees | Export-Csv -NoTypeInformation $employeesPath
$employeeSkillsPath = Join-Path $outDir "employee_skills_public.csv"
$employeeExperiencePath = Join-Path $outDir "employee_experience_public.csv"
$employeeSkills | Export-Csv -NoTypeInformation $employeeSkillsPath
$employeeExperience | Export-Csv -NoTypeInformation $employeeExperiencePath

# 2) Candidates from HR comma sep dataset
$hr = Import-Csv $hrPath
$counter = 1
$candidateSkills = @()
$candidateExperience = @()
$candidates = foreach ($row in $hr) {
  $idx = "{0:D5}" -f $counter
  $seed = $counter + 5000
  $counter++

  $sentiment = 0.5
  if ($row.satisfaction_level) {
    $sentiment = [math]::Round([double]$row.satisfaction_level, 2)
  }
  $match = 0.5
  if ($row.last_evaluation) {
    $match = [math]::Round([double]$row.last_evaluation, 2)
  }
  $name = Get-ProfileName -seed $seed
  $emailBase = (($name -replace '\s+','.' -replace '[^a-zA-Z\.]','').ToLower())
  $email = "$emailBase.cand$idx@public.local"
  $deptRaw = Get-FieldValue -row $row -names @("Department", "department", "sales")
  if ([string]::IsNullOrWhiteSpace($deptRaw)) {
    $deptRaw = "Operations"
  }
  $role = switch ($deptRaw.ToLower()) {
    "sales" { "Account Executive" }
    "technical" { "Software Engineer" }
    "it" { "IT Specialist" }
    "support" { "Customer Support Specialist" }
    "management" { "Operations Manager" }
    "marketing" { "Growth Marketing Specialist" }
    "product_mng" { "Product Analyst" }
    "randd" { "Research Associate" }
    "hr" { "HR Generalist" }
    default { "Business Associate" }
  }
  $baseSkills = Get-RoleSkills -role $role
  foreach ($s in $baseSkills) {
    $candidateSkills += [pscustomobject]@{
      email = $email
      skill_name = $s
      level = [math]::Max(1, [math]::Min(5, [math]::Round(($match * 5), 0)))
    }
  }
  $candidateExperience += [pscustomobject]@{
    email = $email
    company = $companies[$seed % $companies.Count]
    position = $role
    duration_years = if ($row.time_spend_company) { [double]$row.time_spend_company } else { 2.0 }
    description = "Candidate profile sourced from public HR dataset with role-aligned evaluation metrics."
  }

  [pscustomobject]@{
    full_name       = $name
    email           = $email
    department      = $deptRaw
    role            = $role
    sentiment_score = $sentiment
    match_score     = $match
  }
}
$candidatesPath = Join-Path $outDir "candidates_public.csv"
$candidates | Export-Csv -NoTypeInformation $candidatesPath
$candidateSkillsPath = Join-Path $outDir "candidate_skills_public.csv"
$candidateExperiencePath = Join-Path $outDir "candidate_experience_public.csv"
$candidateSkills | Export-Csv -NoTypeInformation $candidateSkillsPath
$candidateExperience | Export-Csv -NoTypeInformation $candidateExperiencePath

Write-Host "Prepared files:"
Write-Host " - $employeesPath"
Write-Host " - $candidatesPath"
Write-Host " - $employeeSkillsPath"
Write-Host " - $employeeExperiencePath"
Write-Host " - $candidateSkillsPath"
Write-Host " - $candidateExperiencePath"
Write-Host ("Employees rows: " + ($employees | Measure-Object).Count)
Write-Host ("Candidates rows: " + ($candidates | Measure-Object).Count)
Write-Host ("Employee skills rows: " + ($employeeSkills | Measure-Object).Count)
Write-Host ("Candidate skills rows: " + ($candidateSkills | Measure-Object).Count)

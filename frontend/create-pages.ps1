# Script to create all remaining page files

$pages = @(
    # Rider pages
    @{Path="src/pages/rider/FindStations.tsx"; Component="FindStations"; Title="Find Stations"},
    @{Path="src/pages/rider/SwapRequest.tsx"; Component="SwapRequest"; Title="Request Battery Swap"},
    @{Path="src/pages/rider/SwapHistory.tsx"; Component="SwapHistory"; Title="Swap History"},
    @{Path="src/pages/rider/Payments.tsx"; Component="Payments"; Title="Payments & Wallet"},
    @{Path="src/pages/rider/Subscription.tsx"; Component="Subscription"; Title="Subscription Management"},
    @{Path="src/pages/rider/RiderProfile.tsx"; Component="RiderProfile"; Title="My Profile"},
    @{Path="src/pages/rider/Support.tsx"; Component="Support"; Title="Support & Help"},
    
    # Operator pages
    @{Path="src/pages/operator/OperatorDashboard.tsx"; Component="OperatorDashboard"; Title="Operator Dashboard"},
    @{Path="src/pages/operator/Inventory.tsx"; Component="Inventory"; Title="Battery Inventory"},
    @{Path="src/pages/operator/SwapProcess.tsx"; Component="SwapProcess"; Title="Process Swap"},
    @{Path="src/pages/operator/Reservations.tsx"; Component="Reservations"; Title="Reservations"},
    @{Path="src/pages/operator/Maintenance.tsx"; Component="Maintenance"; Title="Maintenance Requests"},
    @{Path="src/pages/operator/OperatorAnalytics.tsx"; Component="OperatorAnalytics"; Title="Station Analytics"},
    @{Path="src/pages/operator/OperatorProfile.tsx"; Component="OperatorProfile"; Title="My Profile"},
    
    # Technician pages
    @{Path="src/pages/technician/TechnicianDashboard.tsx"; Component="TechnicianDashboard"; Title="Technician Dashboard"},
    @{Path="src/pages/technician/Tasks.tsx"; Component="Tasks"; Title="Maintenance Tasks"},
    @{Path="src/pages/technician/Diagnostics.tsx"; Component="Diagnostics"; Title="Battery Diagnostics"},
    @{Path="src/pages/technician/WorkHistory.tsx"; Component="WorkHistory"; Title="Work History"},
    @{Path="src/pages/technician/TechnicianProfile.tsx"; Component="TechnicianProfile"; Title="My Profile"},
    
    # Admin pages
    @{Path="src/pages/admin/AdminDashboard.tsx"; Component="AdminDashboard"; Title="Admin Dashboard"},
    @{Path="src/pages/admin/Users.tsx"; Component="Users"; Title="User Management"},
    @{Path="src/pages/admin/Stations.tsx"; Component="Stations"; Title="Station Management"},
    @{Path="src/pages/admin/Batteries.tsx"; Component="Batteries"; Title="Battery Fleet"},
    @{Path="src/pages/admin/Finance.tsx"; Component="Finance"; Title="Financial Management"},
    @{Path="src/pages/admin/Analytics.tsx"; Component="Analytics"; Title="Analytics & Reports"},
    @{Path="src/pages/admin/Settings.tsx"; Component="Settings"; Title="System Settings"}
)

foreach ($page in $pages) {
    $content = @"
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function $($page.Component)() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">$($page.Title)</h1>
          <p className="text-gray-600 mt-1">Manage your $($page.Title.ToLower())</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>$($page.Title)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This page is under development. Content will be added soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
"@
    
    $content | Out-File -FilePath $page.Path -Encoding UTF8
    Write-Host "Created $($page.Path)"
}

Write-Host "`nAll page files created successfully!"

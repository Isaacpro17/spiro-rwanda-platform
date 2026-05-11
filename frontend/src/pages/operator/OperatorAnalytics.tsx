import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export function OperatorAnalytics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Station Analytics</h1>
          <p className="text-gray-600 mt-1">Performance metrics and insights</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Analytics dashboard with charts</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

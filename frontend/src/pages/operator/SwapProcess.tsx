import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export function SwapProcess() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Process Swap</h1>
          <p className="text-gray-600 mt-1">Complete battery swap transactions</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>New Swap Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label>Rider ID / Phone</Label>
                  <Input placeholder="Enter rider ID or scan QR" />
                </div>
                <div className="space-y-2">
                  <Label>Battery Out (Current)</Label>
                  <Input placeholder="Scan battery ID" />
                </div>
                <div className="space-y-2">
                  <Label>Battery In (New)</Label>
                  <Input placeholder="Scan battery ID" />
                </div>
                <Button type="submit" className="w-full">Complete Swap</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">Rider #{item}00{item}</p>
                      <p className="text-sm text-gray-600">Waiting {item * 2} min</p>
                    </div>
                    <Button size="sm">Process</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

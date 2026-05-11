import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'

export function SwapRequest() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request Battery Swap</h1>
          <p className="text-gray-600 mt-1">Reserve your battery swap slot</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>New Swap Request</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="station">Select Station</Label>
                    <Select id="station">
                      <option value="">Choose a station</option>
                      <option value="1">Kigali Station 1</option>
                      <option value="2">Kigali Station 2</option>
                      <option value="3">Kigali Station 3</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time</Label>
                    <Select id="time">
                      <option value="">Select time slot</option>
                      <option value="now">Now</option>
                      <option value="30">In 30 minutes</option>
                      <option value="60">In 1 hour</option>
                      <option value="120">In 2 hours</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Special Instructions (Optional)</Label>
                    <Textarea id="notes" placeholder="Any special requirements..." rows={4} />
                  </div>

                  <Button type="submit" className="w-full">
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Active Reservations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">You have no active reservations</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

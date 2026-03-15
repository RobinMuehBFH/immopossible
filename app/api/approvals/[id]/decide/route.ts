import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface DecideRequest {
  decision: 'approved' | 'rejected'
  notes?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as DecideRequest

    if (!body.decision || !['approved', 'rejected'].includes(body.decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be "approved" or "rejected".' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role - only property_manager or admin can approve
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['property_manager', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only property managers and admins can approve requests' },
        { status: 403 }
      )
    }

    // Fetch the approval request
    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*, damage_report:damage_reports!approval_requests_damage_report_id_fkey(id, status)')
      .eq('id', id)
      .single()

    if (fetchError || !approvalRequest) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      )
    }

    // Check if already decided
    if (approvalRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval request already ${approvalRequest.status}` },
        { status: 400 }
      )
    }

    // Update approval request
    const { error: updateError } = await supabase
      .from('approval_requests')
      .update({
        status: body.decision,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        decision_notes: body.notes || null,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating approval request:', updateError)
      return NextResponse.json(
        { error: 'Failed to update approval request' },
        { status: 500 }
      )
    }

    // Update damage report status based on decision
    const newReportStatus = body.decision === 'approved' 
      ? 'approved' 
      : 'rejected'

    const { error: reportUpdateError } = await supabase
      .from('damage_reports')
      .update({ status: newReportStatus })
      .eq('id', approvalRequest.damage_report_id)

    if (reportUpdateError) {
      console.error('Error updating damage report status:', reportUpdateError)
      // Don't fail the whole request, the approval was recorded
    }

    // TODO: Resume the paused LangGraph agent run (Phase 3 integration)
    // This will be implemented when the agent is ready
    // if (approvalRequest.agent_run_id) {
    //   await resumeAgentRun(approvalRequest.agent_run_id, body.decision)
    // }

    return NextResponse.json({
      success: true,
      decision: body.decision,
      approvalRequestId: id,
      damageReportId: approvalRequest.damage_report_id,
    })
  } catch (error) {
    console.error('Error processing approval decision:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

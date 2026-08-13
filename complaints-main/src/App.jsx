import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LanguageProvider } from './contexts/LanguageContext';

import { LandingPage } from './pages/LandingPage';
import { SubmitComplaint } from './pages/SubmitComplaint';
import { TrackComplaint } from './pages/TrackComplaint';
import { ContactPage } from './pages/ContactPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { Login } from './pages/Login';

import { InternalLayout } from './components/InternalLayout';
import { Dashboard } from './pages/Dashboard';
import { ComplaintList } from './components/ComplaintList';
import { AssessmentList } from './components/AssessmentList';
import { ResponseList } from './components/ResponseList';
import { ComplaintDetail } from './pages/ComplaintDetail';
import { Profile } from './pages/Profile';

import { UserManagement } from './pages/admin/UserManagement';
import { RoleManagement } from './pages/admin/RoleManagement';
import { TaxCenterManagement } from './pages/admin/TaxCenterManagement';

import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';

import { UserRole, ComplaintStatus } from './types';
import {AssignComplaintsPage} from './pages/AssignComplaintsPage';
import { ClosedComplaintsPage } from './pages/ClosedComplaintsPage';
import {
  ApprovedComplaintsPage
} from './pages/ApprovedComplaintsPage';

const normalizeRole = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'HEAD_OFFICE' || normalized === 'HEADOFFICE') {
    return 'HEAD_OFFICE_DIRECTOR';
  }
  return normalized;
};

// ---------------- ROLE GUARD ----------------
function RoleGuard({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const normalizedRole = normalizeRole(user?.display_role || user?.role);

  if (!user || !allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ---------------- ROUTES ----------------
function AppRoutes() {
  const { user: currentUser } = useAuth();

  return (
    <Routes>

      {/* PUBLIC */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/submit" element={<SubmitComplaint />} />
      <Route path="/track" element={<TrackComplaint />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="/login" element={<Login />} />

      {/* INTERNAL */}
      <Route element={<InternalLayout />}>

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/cases/detail/:id" element={<ComplaintDetail />} />

        {/* DIRECTOR */}

       <Route path="/cases/complaints" element={
       <RoleGuard allowedRoles={[
         UserRole.DIRECTOR,
         UserRole.ADMIN,
         UserRole.TEAM_LEADER,
         UserRole.BRANCH_DIRECTOR,
         UserRole.BRANCH_TEAM_LEADER,
         UserRole.HEAD_OFFICE_DIRECTOR,
         UserRole.HEAD_OFFICE_TEAM_LEADER
       ]}>
       <ComplaintList title="Complaints" isAllComplaints />
       </RoleGuard>
        } />

         <Route path="/cases/approved" element={
       <RoleGuard allowedRoles={[
         UserRole.DIRECTOR,
         UserRole.ADMIN,
         UserRole.TEAM_LEADER,
         UserRole.BRANCH_DIRECTOR,
         UserRole.BRANCH_TEAM_LEADER,
         UserRole.BRANCH_OFFICER,
         UserRole.HEAD_OFFICE_DIRECTOR,
         UserRole.HEAD_OFFICE_TEAM_LEADER
       ]}>
       <ApprovedComplaintsPage />
       </RoleGuard>
        } />


   

        <Route path="/cases/head-office-appeals" element={
          <RoleGuard allowedRoles={[
            UserRole.DIRECTOR,
            UserRole.TEAM_LEADER,
            UserRole.HEAD_OFFICE_DIRECTOR,
            UserRole.HEAD_OFFICE_TEAM_LEADER
          ]}>
            <ComplaintList title="Head Office Appeals" status={ComplaintStatus.APPEALED} />
          </RoleGuard>
        } />


        <Route path="/cases/response" element={
          <RoleGuard allowedRoles={[
            UserRole.DIRECTOR,
            UserRole.TEAM_LEADER,
            UserRole.BRANCH_DIRECTOR,
            UserRole.BRANCH_TEAM_LEADER,
            UserRole.HEAD_OFFICE_DIRECTOR,
            UserRole.HEAD_OFFICE_TEAM_LEADER
          ]}>
            <ResponseList title="Response Management" />
          </RoleGuard>
        } />

                <Route path="/cases/assessment" element={
          <RoleGuard allowedRoles={[
            UserRole.DIRECTOR,
            UserRole.TEAM_LEADER,
            UserRole.BRANCH_DIRECTOR,
            UserRole.BRANCH_TEAM_LEADER,
            UserRole.HEAD_OFFICE_DIRECTOR,
            UserRole.HEAD_OFFICE_TEAM_LEADER
          ]}>
            <AssessmentList title="Assessment Management" />
          </RoleGuard>
        } />

        <Route
  path="/manage/assign-complaints"
  element={
    <RoleGuard allowedRoles={[
      UserRole.DIRECTOR,
      UserRole.TEAM_LEADER,
      UserRole.BRANCH_DIRECTOR,
      UserRole.BRANCH_TEAM_LEADER,
      UserRole.HEAD_OFFICE_DIRECTOR,
      UserRole.HEAD_OFFICE_TEAM_LEADER
    ]}>
      <AssignComplaintsPage />
    </RoleGuard>
  }
/>
             <Route
  path="/manage/closed-complaints"
  element={
    <RoleGuard allowedRoles={[
      UserRole.DIRECTOR,
      UserRole.TEAM_LEADER,
      UserRole.BRANCH_DIRECTOR,
      UserRole.BRANCH_TEAM_LEADER,
      UserRole.HEAD_OFFICE_DIRECTOR,
      UserRole.HEAD_OFFICE_TEAM_LEADER
    ]}>
      <ClosedComplaintsPage />
    </RoleGuard>
  }
/>
             <Route
  path="/manage/closed"
  element={
    <Navigate to="/manage/closed-complaints" replace />
  }
/>
  
      

        {/* OFFICER */}
        <Route path="/cases/my" element={
          <RoleGuard allowedRoles={[UserRole.OFFICER, UserRole.BRANCH_OFFICER, UserRole.HEAD_OFFICE_OFFICER]}>
            <ComplaintList title="My Cases" userId={currentUser?.id} />
          </RoleGuard>
        } />

        <Route path="/cases/my-assessment" element={
          <RoleGuard allowedRoles={[UserRole.OFFICER, UserRole.BRANCH_OFFICER, UserRole.HEAD_OFFICE_OFFICER]}>
            <AssessmentList title="My Assessments" userId={currentUser?.id} />
          </RoleGuard>
        } />


          <Route path="/reports/assessment" element={
          <ReportPage title="assessment Report" type="assessment" />
        } />

        <Route path="/cases/my-response" element={
          <RoleGuard allowedRoles={[UserRole.OFFICER, UserRole.BRANCH_OFFICER, UserRole.HEAD_OFFICE_OFFICER]}>
            <ResponseList title="My Responses" status={ComplaintStatus.RESPONDED} userId={currentUser?.id} />
          </RoleGuard>
        } />

          <Route path="/reports/performance" element={
          <ReportPage title="performance Report" type="performance" />
        } />
          {/* <Route path="/reports/feedback" element={
          <ReportPage title="feedback Report" type="feedback" />
        } /> */}






        {/* ADMIN */}
        <Route path="/admin/users" element={
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <UserManagement />
          </RoleGuard>
        } />

        <Route path="/admin/roles" element={
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <RoleManagement />
          </RoleGuard>
        } />

        <Route path="/admin/tax-centers" element={
          <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <TaxCenterManagement />
          </RoleGuard>
        } />

        {/* REPORTS */}
        <Route path="/reports/complaints" element={
          <ReportPage title="Complaints Report" type="complaints" />
        } />

        <Route path="/reports/performance" element={
          <ReportPage title="Performance Report" type="performance" />
        } />

        <Route path="/reports/feedback" element={
          <RoleGuard allowedRoles={[UserRole.HEAD_OFFICE_DIRECTOR, UserRole.HEAD_OFFICE_TEAM_LEADER]}>
            <ReportPage title="Feedback Report" type="feedback" />
          </RoleGuard>
        } />

        {/* REPORTS - SECTION A: GENERAL COMPLAINTS */}
        <Route path="/reports/general-submitted" element={
          <ReportPage title="General Complaints Submitted" type="general-submitted" />
        } />

        <Route path="/reports/responded" element={
          <ReportPage title="Responded Complaints" type="responded" />
        } />

        <Route path="/reports/in-progress" element={
          <ReportPage title="In Progress Complaints" type="in-progress" />
        } />

        <Route path="/reports/frequent" element={
          <ReportPage title="Frequently Submitted Complaints" type="frequent" />
        } />

        <Route path="/reports/assigned-detail" element={
          <ReportPage title="Assigned Complaints" type="assigned-detail" />
        } />

        <Route path="/reports/unassigned" element={
          <ReportPage title="Unassigned Complaints" type="unassigned" />
        } />

        <Route path="/reports/rejected" element={
          <ReportPage title="Rejected Complaints" type="rejected" />
        } />

        {/* REPORTS - SECTION B: ASSIGNED COMPLAINTS TRACKING */}
        <Route path="/reports/assigned-tracking" element={
          <ReportPage title="Assigned Complaints Tracking" type="assigned-tracking" />
        } />

        <Route path="/reports/officer-performance" element={
          <ReportPage title="Officer Performance Report" type="officer-performance" />
        } />

        {/* SETTINGS */}
        <Route path="/settings/categories" element={
          <RoleGuard allowedRoles={[UserRole.DIRECTOR, UserRole.BRANCH_DIRECTOR, UserRole.HEAD_OFFICE_DIRECTOR]}>
            <SettingsPage title="Categories" type="categories" />
          </RoleGuard>
        } />

            <Route path="/settings/status" element={
          <RoleGuard allowedRoles={[UserRole.DIRECTOR, UserRole.BRANCH_DIRECTOR, UserRole.HEAD_OFFICE_DIRECTOR]}>
            <SettingsPage title="Status" type="status" />
          </RoleGuard>
        } />

          <Route path="/settings/subcategories" element={
          <RoleGuard allowedRoles={[UserRole.DIRECTOR, UserRole.BRANCH_DIRECTOR, UserRole.HEAD_OFFICE_DIRECTOR]}>
          <SettingsPage title="Subcategories" type="subcategories" />
          </RoleGuard>
        } />

      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

// ---------------- APP ----------------
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <AppRoutes />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
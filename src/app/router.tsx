import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminMatchDetailsPage } from '../pages/admin/AdminMatchDetailsPage';
import { LiveScoringPage } from '../pages/admin/LiveScoringPage';
import { MatchCreationPage } from '../pages/admin/MatchCreationPage';
import { PlayerManagementPage } from '../pages/admin/PlayerManagementPage';
import { SeasonManagementPage } from '../pages/admin/SeasonManagementPage';
import { TossPage } from '../pages/admin/TossPage';
import { TeamFormationPage } from '../pages/admin/TeamFormationPage';
import { AvailabilityPage } from '../pages/public/AvailabilityPage';
import { DashboardPage } from '../pages/public/DashboardPage';
import { HallOfFamePage } from '../pages/public/HallOfFamePage';
import { LeaderboardsPage } from '../pages/public/LeaderboardsPage';
import { MatchCenterPage } from '../pages/public/MatchCenterPage';
import { MatchHistoryPage } from '../pages/public/MatchHistoryPage';
import { MatchSummaryPage } from '../pages/public/MatchSummaryPage';
import { MyDashboardPage } from '../pages/public/MyDashboardPage';
import { ClubRecordsPage } from '../pages/public/ClubRecordsPage';
import { SeasonSummaryPage } from '../pages/public/SeasonSummaryPage';
import { PlayersPage } from '../pages/public/PlayersPage';
import { SeasonAwardsPage } from '../pages/public/SeasonAwardsPage';
import { SeasonsPage } from '../pages/public/SeasonsPage';
import { TeamComparisonPage } from '../pages/public/TeamComparisonPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/players', element: <PlayersPage /> },
      { path: '/my-dashboard', element: <MyDashboardPage /> },
      { path: '/availability', element: <AvailabilityPage /> },
      { path: '/matches', element: <MatchCenterPage /> },
      { path: '/matches/history', element: <MatchHistoryPage /> },
      { path: '/matches/:matchId', element: <MatchSummaryPage /> },
      { path: '/leaderboards', element: <LeaderboardsPage /> },
      { path: '/seasons', element: <SeasonsPage /> },
      { path: '/teams', element: <TeamComparisonPage /> },
      { path: '/awards', element: <SeasonAwardsPage /> },
      { path: '/hall-of-fame', element: <HallOfFamePage /> },
      { path: '/records', element: <ClubRecordsPage /> },
      { path: '/season-summary', element: <SeasonSummaryPage /> }
    ]
  },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'players', element: <PlayerManagementPage /> },
          { path: 'seasons', element: <SeasonManagementPage /> },
          { path: 'matches/new', element: <MatchCreationPage /> },
          { path: 'matches/:matchId/edit', element: <MatchCreationPage /> },
          { path: 'matches/:matchId/teams', element: <TeamFormationPage /> },
          { path: 'matches/:matchId/toss', element: <TossPage /> },
          { path: 'matches/:matchId/scoring', element: <LiveScoringPage /> },
          { path: 'matches/:matchId/details', element: <AdminMatchDetailsPage /> }
        ]
      }
    ]
  }
]);

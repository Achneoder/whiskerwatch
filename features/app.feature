Feature: The app loads
  As a game master
  I want the app to open reliably
  So that I can start managing my campaign with no setup

  Scenario: Opening Whiskerwatch shows the app shell
    Given I open Whiskerwatch
    Then I should see "Whiskerwatch" in the sidebar
    And I should see the "Overview" navigation entry

  Scenario: The sidebar stays in reach on a long desktop screen
    Given I open Whiskerwatch on a desktop screen
    Then the sidebar's "Settings" entry should be on screen
    When I scroll to the bottom of the page
    Then the sidebar's "Overview" entry should be on screen
    And the sidebar's "Settings" entry should be on screen

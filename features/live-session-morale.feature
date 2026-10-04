Feature: Live Session — hireling wages and morale saves
  As a game master running a session at the table
  I want to roll a hireling's morale save on the spot and settle up wages at
  the end of a session
  So that I can tell whether a stressed or unpaid hireling stays or flees
  without breaking away from Live Session

  Background:
    Given I open Whiskerwatch
    And I start a live session

  Scenario: Tapping a hireling's morale pill rolls a WIL save
    When the GM rolls a morale save for "Oat"
    Then I should see a morale save result showing whether they stay or flee

  Scenario: A party mouse has no morale pill to tap
    Then "Pip" should not show a morale pill

  Scenario: Pay Day lists hirelings with their wage and lets the GM mark them paid
    When the GM opens Pay Day
    Then Pay Day should show "Oat" owed "5p" and marked "Unpaid"
    When the GM marks "Oat" paid in Pay Day
    Then Pay Day should show "Oat" marked "Paid"

  Scenario: An unpaid hireling in Pay Day can be rolled for a morale save inline
    When the GM opens Pay Day
    And the GM rolls the inline morale save for "Oat" in Pay Day
    Then Pay Day should show a morale save result for "Oat"

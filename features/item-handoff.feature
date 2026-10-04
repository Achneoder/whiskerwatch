Feature: Item hand-off between party members in Live Session
  As a game master running a session at the table
  I want to hand an item from one mouse's bag straight to another
  So that loot splits and mid-fight hand-offs don't need a break to fix two
  Roster forms afterward

  Background:
    Given I open Whiskerwatch
    And I navigate to the "Warband" screen
    And the GM opens "Wren" to edit
    And the GM adds "Torch" to an empty inventory slot
    And the GM saves the mouse

  Scenario: Handing an item to another mouse moves it out of the sender's bag
    Given I open Whiskerwatch
    And I start a live session
    When the GM opens "Wren"'s bag
    And the GM taps the move control on "Torch"
    Then I should see "Move Torch to:"
    When the GM hands the item to "Pip"
    Then "Pip"'s bag should show "Torch"
    And "Wren"'s bag should not show "Torch"

  Scenario: A move to an already-full mouse succeeds with a non-blocking encumbered warning
    Given the GM opens "Pip" to edit
    And the GM adds 10 items to the inventory
    And the GM saves the mouse
    And I open Whiskerwatch
    And I start a live session
    When the GM opens "Wren"'s bag
    And the GM taps the move control on "Torch"
    Then the GM should see the encumbered warning next to "Pip"
    When the GM hands the item to "Pip"
    Then "Pip"'s bag should show "Torch"

  Scenario: Backing out of the move picker leaves the item where it was
    Given I open Whiskerwatch
    And I start a live session
    When the GM opens "Wren"'s bag
    And the GM taps the move control on "Torch"
    And the GM backs out of the move picker
    Then the bag should show "Torch"

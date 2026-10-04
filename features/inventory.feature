Feature: Slot inventory
  As a game master
  I want to track what each mouse or hireling is carrying in fixed slots
  So that I know what they have on hand and when someone is overloaded

  Background:
    Given I open Whiskerwatch
    And I navigate to the "Warband" screen

  Scenario: An item added to a mouse's inventory persists after reopening the form
    Given the GM opens "Pip" to edit
    When the GM adds "Rope" to an empty inventory slot
    And the GM saves the mouse
    And I open Whiskerwatch
    And I navigate to the "Warband" screen
    And the GM opens "Pip" to edit
    Then the mouse's inventory should show "Rope"

  Scenario: Loading a mouse past its 10 slots warns that it is encumbered without blocking further items
    Given the GM opens "Pip" to edit
    When the GM adds 11 items to the inventory
    Then the GM should see the Encumbered warning
    And the GM can still add another item to the inventory

  Scenario: A hireling's bag has 6 slots — 2 paws, 2 body, 2 pack
    Given the GM opens "Oat" to edit
    Then the inventory should show "0 / 6 slots used"
    And the inventory should have sections "Paws", "Body" and "Pack"

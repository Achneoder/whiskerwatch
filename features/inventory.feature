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

  Scenario: An item added to an empty pack slot lands in the pack, not in the paws
    Given the GM opens "Pip" to edit
    When the GM adds "Rations" to an empty slot in the "Pack" section
    Then the "Pack" section should hold "Rations"
    And the "Paws" section should not hold "Rations"

  Scenario: Dragging an item onto an empty slot moves it to that section
    Given the GM opens "Pip" to edit
    And the GM adds "Rope" to an empty slot in the "Paws" section
    When the GM drags "Rope" onto an empty slot in the "Pack" section
    Then the "Pack" section should hold "Rope"
    And the "Paws" section should not hold "Rope"

  Scenario: Dropping one item onto another swaps their places, and the swap is saved
    Given the GM opens "Pip" to edit
    And the GM adds "Needle" to an empty slot in the "Paws" section
    And the GM adds "Rations" to an empty slot in the "Pack" section
    When the GM drags "Rations" onto "Needle"
    Then the "Paws" section should hold "Rations"
    And the "Pack" section should hold "Needle"
    When the GM saves the mouse
    And the GM opens "Pip" to edit
    Then the "Paws" section should hold "Rations"
    And the "Pack" section should hold "Needle"

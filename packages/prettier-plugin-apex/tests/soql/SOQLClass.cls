class SOQLClass {
  public void simpleSOQL() {
    Id[] contactIds = new Id[]{};
    Contact[] contacts = [
      SELECT Id, Name, AccountNumber, Site, AccountSource, AnnualRevenue, PersonAssistantName, BillingAddress, Account.Id, Account.CreatedById
      FROM Contact WHERE Id IN :contactIds ORDER BY Name DESC LIMIT 1 OFFSET 5
    ];
    contacts = [
      SELECT Id FROM Contact WHERE Boolean_Field__c = TRUE AND Another_Boolean_Field__c = FALSE
    ];
    Contact[] logicalOperators = [
      SELECT Id
      From Contact
      WHERE (Name = 'Hi' OR Name = 'Hello')
      AND NAME != 'World'
      AND (NOT(Name = 'Oops' OR Name = 'Another'))
      ORDER BY Name NULLS LAST
    ];
    Account[] comparisonOperators = [
      SELECT
        Id
      FROM Account
      WHERE (Name = 'Hi'
      OR Name != 'Hello'
      OR Name LIKE '%Hi%'
      OR Name IN ('Test', 'World')
      OR NAME NOT IN ('Tada', 'No')
      OR MultiPicklist__c INCLUDES ('AAA;BBB', 'CCC')
      OR MultiPicklist__c EXCLUDES ('DDD', 'EEE;FFF'))
      AND (Employees < 100
      OR Employees > 101
      OR Employees >= 200
      OR Employees <= 120)
    ];

    Test__Contract__c[] longFunction = [
      SELECT
        COUNT(ID) numProducts,
        Test_Contract__c,
        SUM(Test__Contract__r.Product_Entitlement_Subscription_Count__c) subscriptionCount
      FROM Test__Subscription__c
      WHERE Id IN :subscription AND Product_Entitlement_Processing_Status__c = :EntitlementConstants.PROCESSING_STATUS_READY
      GROUP BY Test__Contract__c
    ];
    Test__Contract__c[] longFunctionWithPrecedingComments = [
      SELECT
        COUNT(ID) numProducts,
        Test_Contract__c,
        // preceding comment
        SUM(Test__Contract__r.Product_Entitlement_Subscription_Count__c) subscriptionCount
      FROM Test__Subscription__c
      WHERE Id IN :subscription AND Product_Entitlement_Processing_Status__c = :EntitlementConstants.PROCESSING_STATUS_READY
      GROUP BY Test__Contract__c
    ];

    Integer i = [SELECT Count() FROM Contact];
    Contact[] subquery = [SELECT Id, (SELECT Id FROM Contacts LIMIT 5 OFFSET 5) sampleAlias FROM Account ORDER BY Name DESC LIMIT 1];
    Contact[] nestedFrom = [SELECT Id FROM Contact WHERE Id IN (SELECT Id FROM Contact) AND Account.Id <> NULL];
    User[] withAlias = [SELECT u.Name, u.Email, u.Id, u.IsPortalEnabled FROM User u WHERE u.Id = :Userinfo.getUserId()];
    User[] notQuery = [SELECT Id FROM Contact WHERE NOT NAME LIKE '%Test%'];
    Account[] wherePlusCalc = [SELECT Id FROM Account WHERE NumberOfEmployees + AnnualRevenue > 27];
    Account[] whereMinusCalc = [SELECT Id FROM Account WHERE NumberOfEmployees - AnnualRevenue > 27];
    Account[] negativeQueryNum = [SELECT Id FROM Account WHERE NumberOfEmployees > -5];
  }

  void hardlineHeuristics() {
    Account[] accounts = [SELECT Id FROM Account];
    accounts = [
      SELECT Id FROM Account
    ];
    accounts = [
      SELECT Id
      FROM Account
    ];
  }

  void limitBinds() {
    Integer numRows = 5;
    Contact[] contacts = [SELECT ID FROM Contact LIMIT :numRows OFFSET :numRows];
  }

  void bindKeyword() {
    Contact[] contacts = [SELECT ID FROM Contact USING lookup l BIND i='bar'];
    Contact[] contacts = [SELECT ID FROM Contact USING lookup l BIND i='bar', j='baz'];
  }

  void escapeSoql() {
    Contact[] reservedKeywords = [
      SELECT Id
      FROM Contact
      WHERE Name = '\'Test Name\''
      OR Name = '\\Hi'
      OR Name = 'Hello\nWorld'
      OR Name = 'Hello\tWorld'
      OR Name = 'Hello\R\NWorld'
      OR Name = '\n\n\nHi'
    ];
  }

  void dateSoql() {
    // The date/time format literals supported by Salesforce are documented here:
    // https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_dateformats.htm
    // However, it's missing the use case of using a +HHMM offset. We test that here for completeness sake.
    AggregateResult[] literals = [
      SELECT Id, UPPER(CALENDAR_YEAR(CreatedDate))
      FROM Contact
      WHERE CreatedDate > 2018-01-01T00:00:00Z
      OR CreatedDate < 2017-01-01T05:00:00+01:00
      OR CreatedDate < 2016-01-01T01:00:00-02:00
      OR CreatedDate < 2016-01-01T01:00:00+0200
      OR CreatedDate < 2016-01-01T01:00:00-0200
      GROUP BY CALENDAR_YEAR(CreatedDate)
    ];
    AggregateResult[] longMultiFunctions = [
      SELECT
        Id,
        UPPER(CALENDAR_YEAR(Very_Long_Date_Time_Field_That_Will_Surely_Break__c))
      FROM Contact
      GROUP BY CALENDAR_YEAR(Very_Long_Date_Time_Field_That_Will_Surely_Break__c)
    ];
    AggregateResult[] longMultiFunctionsWithPrecedingComments = [
      SELECT
        Id,
        // preceding comments
        UPPER(CALENDAR_YEAR(Very_Long_Date_Time_Field_That_Will_Surely_Break__c))
      FROM Contact
      GROUP BY CALENDAR_YEAR(Very_Long_Date_Time_Field_That_Will_Surely_Break__c)
    ];
    Contact[] contacts = [SELECT Id FROM Contact WHERE CreatedDate < 2018-01-01 OR CreatedDate > TOMORROW OR CreatedDate = LAST_N_DAYS:365];
  }

  void groupSoql() {
    AggregateResult[] currencies = [SELECT Name, MAX(Amount) FROM Opportunity GROUP BY Name HAVING MAX(Amount) > USD10000];
    AggregateResult[] groupedResults = [select avg(amount) aver from opportunity];
    AggregateResult[] longGroupedResultsWithHaving = [
      SELECT COUNT(Foo_Customer__c) countOfFooCustomers, Login_Really_Long_Field__c, Bar__c
      FROM Foo_User__c
      GROUP BY Login_Really_Long_Field__c, Bar__c HAVING COUNT(Foo_Customer__c) > 1 AND Login_Really_Long_Field__c IN :allEmailAddresses
    ];
    AggregateResult[] longGroupedResultsWithOrderBy = [
      SELECT COUNT(Foo_Customer__c) countOfFooCustomers, Login_Really_Long_Field__c, Bar__c
      FROM Foo_User__c
      GROUP BY Login_Really_Long_Field__c, Bar__c, Another_Login_Really_Long_Field_That_Will_Break__c
      ORDER BY Login_Really_Long_Field__c, Bar__c, Another_Login_Really_Long_Field_That_Will_Break__c
    ];
    AggregateResult[] anotherGroupedResults = [
      SELECT CampaignId, AVG(Amount)
      FROM Opportunity
      GROUP BY CampaignId];
    AggregateResult[] groupByRollups = [
      SELECT LeadSource, COUNT(Name) cnt
      FROM Lead
      GROUP BY ROLLUP(LeadSource)
    ];
    AggregateResult[] groupByCubes = [
      SELECT Type, BillingCountry,
        GROUPING(Type) grpType, GROUPING(BillingCountry) grpCty,
        COUNT(id) accts
      FROM Account
      GROUP BY CUBE(Type, BillingCountry)
      ORDER BY GROUPING(Type), GROUPING(BillingCountry)
    ];
    AggregateResult[] groupByCubesLong = [
      SELECT Type, BillingCountry,
        GROUPING(Type) grpType, GROUPING(BillingCountry) grpCty,
        COUNT(id) accts
      FROM Account
      GROUP BY CUBE(Type, BillingCountry, Site, Owner, Name, Description, PersonEmail, PersonDoNotCall, Industry)
      ORDER BY GROUPING(Type), GROUPING(BillingCountry)
    ];
    AggregateResult[] groupByCubeWithHavings = [
      SELECT Type, BillingCountry,
        GROUPING(Type) grpType, GROUPING(BillingCountry) grpCty,
        COUNT(id) accts
      FROM Account
      GROUP BY CUBE(Type, BillingCountry, Site, Owner, Name, Description, PersonEmail, PersonDoNotCall, Industry)
      HAVING MAX(NumberOfEmployees) > 100
      ORDER BY GROUPING(Type), GROUPING(BillingCountry)
    ];
  }

  void orderSoql() {
    Contact[] withoutExplicitOrderAndNullOrder = [SELECT Id FROM Contact ORDER BY Name];
    Contact[] withoutExplicitNullOrder = [SELECT Id FROM Contact ORDER BY NAME ASC];
    Contact[] withoutExplicitOrder = [SELECT Id FROM Contact ORDER BY Name NULLS LAST];
    Contact[] fullOrder = [SELECT Id FROM Contact ORDER BY Name ASC NULLS FIRST];
  }

  void withIdentifiersSoql() {
    Account[] withSecurityEnforced = [SELECT Id FROM Account WITH SECURITY_ENFORCED];
    Account[] withRandomIdentifiers = [SELECT Id FROM Account WITH SECURITY_ENFORCED WITH RANDOM_IDENTIFIER];
    Account[] withIdentifierOrder = [SELECT Id FROM Account WHERE Name = 'Hello' WITH SECURITY_ENFORCED GROUP BY Id];
  }

  void nicheSoql() {
    Contact[] forView = [SELECT Name, ID FROM Contact  LIMIT 1 FOR VIEW];
    Contact[] forReference = [SELECT Name, ID FROM Contact  LIMIT 1 FOR REFERENCE];
    Account [] forUpdate = [SELECT Id FROM Account LIMIT 2 FOR UPDATE];
    Account[] includeDeleted = [SELECT Id FROM Account ALL ROWS];
    Account[] forViewAllRows = [SELECT Id FROM Account FOR VIEW ALL ROWS];
    FAQ__kav[] updateTrackings = [
      SELECT Title FROM FAQ__kav
      WHERE Keyword='Apex' and
      Language = 'en_US' and
      KnowledgeArticleVersion = 'ka230000000PCiy'
      UPDATE TRACKING];
    FAQ__kav[] updateViewStats = [
      SELECT Title FROM FAQ__kav
      WHERE PublishStatus='online' and
      Language = 'en_US' and
      KnowledgeArticleVersion = 'ka230000000PCiy'
      UPDATE VIEWSTAT
    ];
    FAQ__kav[] updateViewStatsAllRows = [
      SELECT Title FROM FAQ__kav
      WHERE PublishStatus='online' and
      Language = 'en_US' and
      KnowledgeArticleVersion = 'ka230000000PCiy'
      UPDATE VIEWSTAT
      ALL ROWS
    ];

    Contact[] usingScope = [SELECT Id FROM Contact USING SCOPE Mine];
    Contact[] usingListView = [SELECT Id FROM Contact USING listView(id=listViewId)];
    Offer__DataCategorySelection dataCategory = [SELECT Id,ParentId FROM Offer__DataCategorySelection];
    Warehouse__c[] geoLocations = [
      SELECT Name, StreetAddress__c
      FROM Warehouse__c
      WHERE DISTANCE(Location__c, GEOLOCATION(37.775,-122.418), 'mi') < 20
      ORDER BY DISTANCE(Location__c, GEOLOCATION(37.775,-122.418), 'mi')
      LIMIT 10
    ];
    Contact[] geoLocationExprs = [
      SELECT Id FROM Contact ORDER BY Distance(MailingAddress, :resourceRequestGeoLocation, 'km')
    ];
    Decimal lat;
    Decimal lon;
    return [
      SELECT Id
      FROM Lead
      WHERE DISTANCE(Address, GEOLOCATION(:lat, :lon), 'km') < 5
    ];
    UserProfileFeed[] withUserIds = [SELECT Id FROM UserProfileFeed WITH UserId='005D0000001AamR' ORDER BY CreatedDate DESC, Id DESC LIMIT 20];
    Question[] withSingleDataCategories = [SELECT Title FROM Question WHERE LastReplyDate > 2005-10-08T01:02:03Z WITH DATA CATEGORY Geography__c AT (usa__c, uk__c)];
    Question[] withMultipleDataCategories = [
      SELECT Title
      FROM Question
      WHERE LastReplyDate > 2005-10-08T01:02:03Z
      WITH DATA CATEGORY Geography__c AT (usa__c, uk__c) AND Product__c ABOVE_OR_BELOW usa__c
    ];
  }

  void typeOfSoql() {
    List<Foo_User__c> smallTypeOf = [
      SELECT Id,
          TYPEOF Owner
            WHEN User THEN Id
            WHEN Group THEN Id
          END
      FROM Foo_User__c
    ];
    Event[] typeOf = [
      SELECT
        TYPEOF What
          WHEN Account THEN Phone, NumberOfEmployees
          WHEN Opportunity THEN Amount, CloseDate
          ELSE Name, Email
        END
      FROM Event];
  }

  void whereCompoundClauses() {
    Account[] accounts = [
      select id
      from Account
      where
      (
        Name = 'Test Account'
        AND
        Name = 'Test Account 2'
      )
      AND Status = 'Active'
    ];
    Account[] accounts = [
      select id
      from Account
      where
      (
        Name = 'Test Account'
        OR
        Name = 'Test Account 2'
      )
      AND Status = 'Active'
    ];
    Account[] accounts = [
      select id
      from Account
      where
      (
        Name = 'Test Account'
        AND
        Name = 'Test Account 2'
      )
      AND (Status = 'Active' AND Status != 'Inactive')
    ];
    Account[] accounts = [
      select id
      from Account
      where
      (
        Name = 'Test Account'
        OR
        Name = 'Test Account 2'
      )
      AND (Status = 'Active' AND Status != 'Inactive')
    ];
  }

  void multipleTypes() {
    Contact[] a = [
      SELECT a.Name
      FROM Contact, Contact.Account a
    ];

    a = [
      SELECT count()
      FROM Contact c, c.Account a
      WHERE a.name = 'Name'
    ];
  }

  void selectDistanceExpression() {
    Service__c service = [
      SELECT
        id,
        DISTANCE(
          Location__c,
          GEOLOCATION(
            :client.Location__Latitude__s,
            :client.Location__Longitude__s
          ),
          'mi'
        ) dist
        FROM Service__c
        WHERE
          DISTANCE(
            Location__c,
            GEOLOCATION(
              :client.Location__Latitude__s,
              :client.Location__Longitude__s
            ),
            'mi'
          ) < :defaultMaxDistance
    ];
  }

  void fieldGroupings() {
    Contact[] contacts = [
      SELECT FIELDS(ALL)
      FROM Contact
    ];
    contacts = [
      SELECT FIELDS(STANDARD)
      FROM Contact
    ];
    contacts = [
      SELECT FIELDS(CUSTOM)
      FROM Contact
    ];
  }

  void queryIgnore() {
    // #1891 - pretty ignored code could lead to invalid formatted SOQL
    Contact contacts = [
      // prettier-ignore
      SELECT Id
      FROM Contact
      LIMIT 10
    ];
    Contact contacts = [
      // prettier-ignore
      SELECT Id
      FROM Contact
      LIMIT /* test inline comment */ 10
    ];
    Contact contacts = [
      // prettier-ignore
      SELECT Id
      FROM Contact
      LIMIT // test remaining comment
        10
    ];
    contacts = [
      // prettier-ignore
      SELECT Id
      FROM Contact
      LIMIT :abcd
    ];
    contacts = [
      SELECT Id
      FROM Contact
      // prettier-ignore
      WHERE
        Quote__c != NULL
        AND (
          Bar__c IN ('Baz', 'Qux')
          OR (
            Bar__c = 'Faux'
            AND Cat__c.Sat__c = TRUE
          )
      )
    ];
    contacts = [
      SELECT Id
      FROM Contact
      WHERE Id IN (
        SELECT Quote__c
        FROM Foo__r
        // prettier-ignore
        WHERE
          Quote__c != NULL
          AND (Bar__c IN ('Baz', 'Qux')
          OR (
            Bar__c = 'Faux'
            AND Cat__c.Sat__c = TRUE
          )
        )
      )
    ];
    contacts = [
      SELECT Id
      FROM Contact
      WHERE Id IN (
        SELECT Quote__c
        FROM Foo__r
        // prettier-ignore
        WHERE Quote__c != NULL
        AND (
          Bar__c IN ('Baz', 'Qux')
          OR (
            Cat__c = 'Faux'
            AND (
              Status__c = 'Complete'
            )
          )
        )
      )
    ];
    contacts = [
      SELECT Id, (SELECT Id FROM Foo__r)
      FROM Contact
      WHERE
      CreatedDate < 2025-02-13T00:00:00Z
      AND Id IN (
          SELECT Quote__c
          FROM Foo__r
          // prettier-ignore
          WHERE
            Quote__c != NULL
            AND (Bar__c IN ('Baz', 'Qux')
            OR (
              Cat__c = 'Faux'
              AND Bat__c.Sat__c = TRUE
              AND (
                NOT (
                  Status__c = 'Complete'
                  AND (
                    Someting__r.Active__c = FALSE
                    OR Something__r.Status__c = 'Active'
                  )
                )
              )
            )
          )
        )
      LIMIT 10
    ];
  }
}


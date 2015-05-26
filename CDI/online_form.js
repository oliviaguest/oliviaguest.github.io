function process_compute_total_click()
{
        var idx;

        // ANIMAL SOUNDS FORM
        var animal_sounds_understood = 0;
        for(idx = 0; idx < document.animal_sounds_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.animal_sounds_form.spoken_chkbox[idx].checked?document.animal_sounds_form.understood_chkbox[idx].checked=true:null;
                document.animal_sounds_form.understood_chkbox[idx].checked?animal_sounds_understood++:null;
             }
        var animal_sounds_spoken = 0;
        for(idx = 0; idx < document.animal_sounds_form.spoken_chkbox.length; idx++)
        {document.animal_sounds_form.spoken_chkbox[idx].checked?animal_sounds_spoken++:null;}

        // ANIMALS FORM
        var animals_understood = 0;
        for(idx = 0; idx < document.animals_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.animals_form.spoken_chkbox[idx].checked?document.animals_form.understood_chkbox[idx].checked=true:null;
                document.animals_form.understood_chkbox[idx].checked?animals_understood++:null;
             }
        var animals_spoken = 0;
        for(idx = 0; idx < document.animals_form.spoken_chkbox.length; idx++)
        {document.animals_form.spoken_chkbox[idx].checked?animals_spoken++:null;}

        // VEHICLES FORM
        var vehicles_understood = 0;
        for(idx = 0; idx < document.vehicles_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.vehicles_form.spoken_chkbox[idx].checked?document.vehicles_form.understood_chkbox[idx].checked=true:null;
                document.vehicles_form.understood_chkbox[idx].checked?vehicles_understood++:null;
             }
        var vehicles_spoken = 0;
        for(idx = 0; idx < document.vehicles_form.spoken_chkbox.length; idx++)
        {document.vehicles_form.spoken_chkbox[idx].checked?vehicles_spoken++:null;}

        // TOYS FORM
        var toys_understood = 0;
        for(idx = 0; idx < document.toys_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.toys_form.spoken_chkbox[idx].checked?document.toys_form.understood_chkbox[idx].checked=true:null;
                document.toys_form.understood_chkbox[idx].checked?toys_understood++:null;
             }
        var toys_spoken = 0;
        for(idx = 0; idx < document.toys_form.spoken_chkbox.length; idx++)
        {document.toys_form.spoken_chkbox[idx].checked?toys_spoken++:null;}

        // FOOD AND DRINK FORM
        var food_and_drink_understood = 0;
        for(idx = 0; idx < document.food_and_drink_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.food_and_drink_form.spoken_chkbox[idx].checked?document.food_and_drink_form.understood_chkbox[idx].checked=true:null;
                document.food_and_drink_form.understood_chkbox[idx].checked?food_and_drink_understood++:null;
             }
        var food_and_drink_spoken = 0;
        for(idx = 0; idx < document.food_and_drink_form.spoken_chkbox.length; idx++)
        {document.food_and_drink_form.spoken_chkbox[idx].checked?food_and_drink_spoken++:null;}

        // BODY PARTS FORM
        var body_parts_understood = 0;
        for(idx = 0; idx < document.body_parts_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.body_parts_form.spoken_chkbox[idx].checked?document.body_parts_form.understood_chkbox[idx].checked=true:null;
                document.body_parts_form.understood_chkbox[idx].checked?body_parts_understood++:null;
             }
        var body_parts_spoken = 0;
        for(idx = 0; idx < document.body_parts_form.spoken_chkbox.length; idx++)
        {document.body_parts_form.spoken_chkbox[idx].checked?body_parts_spoken++:null;}

        // CLOTHES FORM
        var clothes_understood = 0;
        for(idx = 0; idx < document.clothes_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.clothes_form.spoken_chkbox[idx].checked?document.clothes_form.understood_chkbox[idx].checked=true:null;
                document.clothes_form.understood_chkbox[idx].checked?clothes_understood++:null;
             }
        var clothes_spoken = 0;
        for(idx = 0; idx < document.clothes_form.spoken_chkbox.length; idx++)
        {document.clothes_form.spoken_chkbox[idx].checked?clothes_spoken++:null;}

        // FURNITURE AND ROOMS FORM
        var furniture_and_rooms_understood = 0;
        for(idx = 0; idx < document.furniture_and_rooms_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.furniture_and_rooms_form.spoken_chkbox[idx].checked?document.furniture_and_rooms_form.understood_chkbox[idx].checked=true:null;
                document.furniture_and_rooms_form.understood_chkbox[idx].checked?furniture_and_rooms_understood++:null;
             }
        var furniture_and_rooms_spoken = 0;
        for(idx = 0; idx < document.furniture_and_rooms_form.spoken_chkbox.length; idx++)
        {document.furniture_and_rooms_form.spoken_chkbox[idx].checked?furniture_and_rooms_spoken++:null;}

        // OUTSIDE FORM
        var outside_understood = 0;
        for(idx = 0; idx < document.outside_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.outside_form.spoken_chkbox[idx].checked?document.outside_form.understood_chkbox[idx].checked=true:null;
                document.outside_form.understood_chkbox[idx].checked?outside_understood++:null;
             }
        var outside_spoken = 0;
        for(idx = 0; idx < document.outside_form.spoken_chkbox.length; idx++)
        {document.outside_form.spoken_chkbox[idx].checked?outside_spoken++:null;}

        // HOUSEHOLD ITEMS FORM
        var household_items_understood = 0;
        for(idx = 0; idx < document.household_items_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.household_items_form.spoken_chkbox[idx].checked?document.household_items_form.understood_chkbox[idx].checked=true:null;
                document.household_items_form.understood_chkbox[idx].checked?household_items_understood++:null;
             }
        var household_items_spoken = 0;
        for(idx = 0; idx < document.household_items_form.spoken_chkbox.length; idx++)
        {document.household_items_form.spoken_chkbox[idx].checked?household_items_spoken++:null;}

        // PEOPLE FORM
        var people_understood = 0;
        for(idx = 0; idx < document.people_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.people_form.spoken_chkbox[idx].checked?document.people_form.understood_chkbox[idx].checked=true:null;
                document.people_form.understood_chkbox[idx].checked?people_understood++:null;
             }
        var people_spoken = 0;
        for(idx = 0; idx < document.people_form.spoken_chkbox.length; idx++)
        {document.people_form.spoken_chkbox[idx].checked?people_spoken++:null;}

        // GAMES AND ROUTINES FORM
        var games_and_routines_understood = 0;
        for(idx = 0; idx < document.games_and_routines_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.games_and_routines_form.spoken_chkbox[idx].checked?document.games_and_routines_form.understood_chkbox[idx].checked=true:null;
                document.games_and_routines_form.understood_chkbox[idx].checked?games_and_routines_understood++:null;
             }
        var games_and_routines_spoken = 0;
        for(idx = 0; idx < document.games_and_routines_form.spoken_chkbox.length; idx++)
        {document.games_and_routines_form.spoken_chkbox[idx].checked?games_and_routines_spoken++:null;}

        // ACTION WORDS FORM
        var action_words_understood = 0;
        for(idx = 0; idx < document.action_words_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.action_words_form.spoken_chkbox[idx].checked?document.action_words_form.understood_chkbox[idx].checked=true:null;
                document.action_words_form.understood_chkbox[idx].checked?action_words_understood++:null;
             }
        var action_words_spoken = 0;
        for(idx = 0; idx < document.action_words_form.spoken_chkbox.length; idx++)
        {document.action_words_form.spoken_chkbox[idx].checked?action_words_spoken++:null;}

        // DESCRIPTIVE WORDS FORM
        var descriptive_words_understood = 0;
        for(idx = 0; idx < document.descriptive_words_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.descriptive_words_form.spoken_chkbox[idx].checked?document.descriptive_words_form.understood_chkbox[idx].checked=true:null;
                document.descriptive_words_form.understood_chkbox[idx].checked?descriptive_words_understood++:null;
             }
        var descriptive_words_spoken = 0;
        for(idx = 0; idx < document.descriptive_words_form.spoken_chkbox.length; idx++)
        {document.descriptive_words_form.spoken_chkbox[idx].checked?descriptive_words_spoken++:null;}

        // QUESTION WORDS FORM
        var question_words_understood = 0;
        for(idx = 0; idx < document.question_words_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.question_words_form.spoken_chkbox[idx].checked?document.question_words_form.understood_chkbox[idx].checked=true:null;
                document.question_words_form.understood_chkbox[idx].checked?question_words_understood++:null;
             }
        var question_words_spoken = 0;
        for(idx = 0; idx < document.question_words_form.spoken_chkbox.length; idx++)
        {document.question_words_form.spoken_chkbox[idx].checked?question_words_spoken++:null;}

        // TIME FORM
        var time_understood = 0;
        for(idx = 0; idx < document.time_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.time_form.spoken_chkbox[idx].checked?document.time_form.understood_chkbox[idx].checked=true:null;
                document.time_form.understood_chkbox[idx].checked?time_understood++:null;
             }
        var time_spoken = 0;
        for(idx = 0; idx < document.time_form.spoken_chkbox.length; idx++)
        {document.time_form.spoken_chkbox[idx].checked?time_spoken++:null;}

        // PRONOUNS FORM
        var pronouns_understood = 0;
        for(idx = 0; idx < document.pronouns_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.pronouns_form.spoken_chkbox[idx].checked?document.pronouns_form.understood_chkbox[idx].checked=true:null;
                document.pronouns_form.understood_chkbox[idx].checked?pronouns_understood++:null;
             }
        var pronouns_spoken = 0;
        for(idx = 0; idx < document.pronouns_form.spoken_chkbox.length; idx++)
        {document.pronouns_form.spoken_chkbox[idx].checked?pronouns_spoken++:null;}

        // PREPOSITIONS FORM
        var prepositions_understood = 0;
        for(idx = 0; idx < document.prepositions_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.prepositions_form.spoken_chkbox[idx].checked?document.prepositions_form.understood_chkbox[idx].checked=true:null;
                document.prepositions_form.understood_chkbox[idx].checked?prepositions_understood++:null;
             }
        var prepositions_spoken = 0;
        for(idx = 0; idx < document.prepositions_form.spoken_chkbox.length; idx++)
        {document.prepositions_form.spoken_chkbox[idx].checked?prepositions_spoken++:null;}

        // QUANTIFIERS FORM
        var quantifiers_understood = 0;
        for(idx = 0; idx < document.quantifiers_form.understood_chkbox.length; idx++)
            {
                // ensure that if spoken is checked understood is also checked
                document.quantifiers_form.spoken_chkbox[idx].checked?document.quantifiers_form.understood_chkbox[idx].checked=true:null;
                document.quantifiers_form.understood_chkbox[idx].checked?quantifiers_understood++:null;
             }
        var quantifiers_spoken = 0;
        for(idx = 0; idx < document.quantifiers_form.spoken_chkbox.length; idx++)
        {document.quantifiers_form.spoken_chkbox[idx].checked?quantifiers_spoken++:null;}

        var total_understood;
        var total_spoken;
        total_understood = animal_sounds_understood + animals_understood + vehicles_understood + toys_understood + food_and_drink_understood + body_parts_understood + clothes_understood + furniture_and_rooms_understood + outside_understood + household_items_understood + people_understood + games_and_routines_understood + action_words_understood + descriptive_words_understood + question_words_understood + time_understood + pronouns_understood + prepositions_understood + quantifiers_understood;
        total_spoken = animal_sounds_spoken + animals_spoken + vehicles_spoken + toys_spoken + food_and_drink_spoken + body_parts_spoken + clothes_spoken + furniture_and_rooms_spoken + outside_spoken + household_items_spoken + people_spoken + games_and_routines_spoken + action_words_spoken + descriptive_words_spoken + question_words_spoken + time_spoken + pronouns_spoken + prepositions_spoken + quantifiers_spoken;

feedback = window.open( "", "<h2>Online Oxford CDI form - feedback</h2>", "status = 1, height = 700, width = 400, resizable = 1, menubar=1, scrollbars=1" );

//feedback.document.writeln('<html><body>');
    feedback.document.writeln('<h2>Oxford CDI totals</h2>'); 
    feedback.document.writeln('<table>'); 
            feedback.document.writeln("<tr><td><b>Category</b></td><td><b>Understood</b></td><td><b>Spoken</b></td></tr>"); 
            feedback.document.writeln("<tr><td>Animal sounds</td><td align=center>"+animal_sounds_understood+"</td><td align=center>"+animal_sounds_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Animals</td><td align=center>"+animals_understood+"</td><td align=center>"+animals_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Vehicles</td><td align=center>"+vehicles_understood+"</td><td align=center>"+vehicles_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Toys</td><td align=center>"+toys_understood+"</td><td align=center>"+toys_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Food and drink</td><td align=center>"+food_and_drink_understood+"</td><td align=center>"+food_and_drink_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Body parts</td><td align=center>"+body_parts_understood+"</td><td align=center>"+body_parts_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Clothes</td><td align=center>"+clothes_understood+"</td><td align=center>"+clothes_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Furniture and rooms</td><td align=center>"+furniture_and_rooms_understood+"</td><td align=center>"+furniture_and_rooms_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Outside</td><td align=center>"+outside_understood+"</td><td align=center>"+outside_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Housohold items</td><td align=center>"+household_items_understood+"</td><td align=center>"+household_items_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>People</td><td align=center>"+people_understood+"</td><td align=center>"+people_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Games and routines</td><td align=center>"+games_and_routines_understood+"</td><td align=center>"+games_and_routines_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Action words</td><td align=center>"+action_words_understood+"</td><td align=center>"+action_words_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Descriptive words</td><td align=center>"+descriptive_words_understood+"</td><td align=center>"+descriptive_words_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Question words</td><td align=center>"+question_words_understood+"</td><td align=center>"+question_words_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Time</td><td align=center>"+time_understood+"</td><td align=center>"+time_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Pronouns</td><td align=center>"+pronouns_understood+"</td><td align=center>"+pronouns_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Prepositions</td><td align=center>"+prepositions_understood+"</td><td align=center>"+prepositions_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Quantifiers</td><td align=center>"+quantifiers_understood+"</td><td align=center>"+quantifiers_spoken+"</td></tr>"); 
            feedback.document.writeln("<tr><td>Totals</td><td align=center>"+total_understood+"</td><td align=center>"+total_spoken+"</td></tr>"); 
                    
        feedback.document.writeln('</table>'); 

        feedback.document.writeln('<p><p><center><form method="post"><input type="button" value="Close" onclick="window.close()"></form></center>');
 
//feedback.document.writeln('</body></html>');
feedback.document.close();

}
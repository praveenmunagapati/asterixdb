function AsterixSDK() {

    // Asterix SDK => send
    // Posts a message containing an API endpoint, json data,
    // and a UI callback function.
    //
    // @param handler [Asterix REST Controller], a handler object
    // that provides REST request information. 
    //
    // Anticipated Usage:
    //
    // var a = AsterixSDK();
    // var e = Expression;
    // var h = AsterixRestController.bind(e);
    // a.send(h);
    myThis = this;
    this.callbacks = {
        "sync" : function() { alert("default sync"); },
        "async" : function() {}
    };
    this.send = function(handler, cb) {
        myThis.callbacks = cb;
        this.handler = handler;
        this.extras = handler["extras"];
        this.xhr.post(
            handler["endpoint"],
            handler["apiData"],
            this.branch          
        );
    };

    this.branch = function(response) {
        if (response && response["error-code"]) {
           
            alert("Error [Code" + response["error-code"][0] + "]: " + response["error-code"][1]);
            
        } else if (response && response["results"]) {
            var fn_callback = myThis.callbacks["sync"];
            fn_callback(response, myThis.extras);
            
        } else if (response["handle"]) {
            
            var fn_callback = this.callbacks["async"];
            fn_callback(response, extra);
            
        } else if (response["status"]) {
                
            var fn_callback = this.callbacks["sync"];
            fn_callback(response, extra);
        }
    }

    // Asterix SDK => bindingHandler
    // AsterixExpression form handler where a new REST API point is bound. Takes as input any
    // AsterixExpression, each of which is bindable.
    this.bindingHandler = new AsterixExpression();
    this.bind = this.bindingHandler.bind;
}

function AsterixExpression() {
    this.init();
    return this;
}

AsterixExpression.prototype.init = function () {
    this.dataverse = ""; // TODO This shouldn't make it to send
    this.boundTo = {};
    this.clauses = [];
    this.ui_callback_on_success = function() {};
    this.ui_callback_on_success_async = function() {};
};

AsterixExpression.prototype.bind = function(expression) {
    // If expression is an AsterixExpression, it becomes base
    if (expression instanceof AsterixExpression) {
        this.boundTo = expression;
    } else if (expression instanceof AsterixClause) {
        this.clauses.push(expression.val());
    }
    return this;
};

AsterixExpression.prototype.send = function(arc) {
    // Hackiest of hacks
    var g = new AsterixSDK();
    g.send(arc, arc["callback"]);
};

AsterixExpression.prototype.clear = function() {
    this.clauses.length = 0;
    return this;
};

AsterixExpression.prototype.val = function() {
    return this.clauses.join("\n"); 
};

AsterixExpression.prototype.success = function(fn, isSync) {
    if (isSync) {
        this.ui_callback_on_success = fn;
    } else { 
        this.ui_callback_on_success_async = fn;
    }
    return this;
};

AsterixExpression.prototype.set = function(statements_arr) {
    for (var i = 0; i < statements_arr.length; i++) {
        this.clauses.push(statements_arr[i]);
    }
    return this;
};

AsterixExpression.prototype.use_dataverse = function(dv) {
    this.dataverse = dv;
    this.clauses.push("use dataverse " + dv + ";");
    return this; 
};

AsterixExpression.prototype.return = function(return_object) {
    var components = [];
    for (var key in return_object) {
        components.push('"' + key + '" : ' + return_object[key]);
    }
    
    var return_expression = 'return { ' + components.join(', ') + ' }'; 
    this.clauses.push(return_expression);
    return this;
};










// Temporary AsterixExpression Placeholder
function AExpression () {
    this._properties = {};
    this._success = function() {};

    return this;
}


AExpression.prototype.bind = function(options) {
    var options = options || {};

    if (options.hasOwnProperty("dataverse")) {
        this._properties["dataverse"] = options["dataverse"];
    }

    if (options.hasOwnProperty("success")) {
        this._success = options["success"];
    }

    if (options.hasOwnProperty("return")) {
        this._properties["return"] = " return " + options["return"].val();
    }
};


AExpression.prototype.run = function() {
    var success_fn = this._success;

    $.ajax({
        type : 'GET',
        url : "http://localhost:19101/query",
        data : {"query" : this.val()},
        dataType : "json",
        success : function(data) {     
            success_fn(data);
        }
    });

    return this;
};


AExpression.prototype.val = function() { 

    // If there is a dataverse defined, provide it.
    if (this._properties.hasOwnProperty("dataverse")) {
        return "use dataverse " + this._properties["dataverse"] + ";\n";
    } else {
        return this.error("Missing dataverse.");
    }
};


AExpression.prototype.onReturn = function() {
    var ret = "";    

    if (this._properties.hasOwnProperty("return")) {
        ret += this._properties["return"] + ";";
    }

    return ret;
};


AExpression.prototype.error = function(msg) {
    return "Asterix FunctionExpression Error: " + msg;
};


// FunctionExpression
// Parent: AsterixExpression
// 
// @param   options [Various], 
// @key     function [String], a function to be applid to the expression
// @key     expression [AsterixExpression or AsterixClause] an AsterixExpression/Clause to which the fn will be applied
function FunctionExpression(options) {
    
    // Initialize superclass
    AExpression.call(this);

    // Possible to initialize a function epxression without inputs, or with them
    this.bind(options);

    // Return object
    return this;
}


FunctionExpression.prototype = Object.create(AExpression.prototype);
FunctionExpression.prototype.constructor = FunctionExpression;


FunctionExpression.prototype.bind = function(options) {

    AExpression.prototype.bind.call(this, options);
    
    var options = options || {};

    if (options.hasOwnProperty("function")) {
        this._properties["function"] = options["function"];
    }

    if (options.hasOwnProperty("expression")) {
        this._properties["expression"] = options["expression"];
    }

    return this;
};

FunctionExpression.prototype.val = function () { 

    var value = AExpression.prototype.val.call(this);

    return value + this._properties["function"] + "(" + this._properties["expression"].val() + ");" + AExpression.prototype.onReturn.call(this); 
};


// FLWOGR         ::= ( ForClause | LetClause ) ( Clause )* "return" Expression
// Clause         ::= ForClause | LetClause | WhereClause | OrderbyClause | GroupClause | LimitClause | DistinctClause
// 
// WhereClause    ::= "where" Expression
// OrderbyClause  ::= "order" "by" Expression ( ( "asc" ) | ( "desc" ) )? ( "," Expression ( ( "asc" ) | ( "desc" ) )? )*
// GroupClause    ::= "group" "by" ( Variable ":=" )? Expression ( "," ( Variable ":=" )? Expression )* ( "decor" Variable ":=" Expression ( "," "decor" Variable ":=" Expression )* )? "with" VariableRef ( "," VariableRef )*
// LimitClause    ::= "limit" Expression ( "offset" Expression )?
// DistinctClause ::= "distinct" "by" Expression ( "," Expression )*


// FLWOGRExpression
//
// FLWOGRExpression ::= ( ForClause | LetClause ) ( Clause )* "return" Expression
function FLWOGRExpression (options) {
    // Initialize superclass
    AExpression.call(this);

    this._properties["clauses"] = [];

    // Bind options and return
    this.bind(options);
    return this;
}


FLWOGRExpression.prototype = Object.create(AExpression.prototype);
FLWOGRExpression.prototype.constructor = FLWOGRExpression;


FLWOGRExpression.prototype.bind = function(options) {
    AExpression.prototype.bind.call(this, options);

    var options = options || {};

    if (this._properties["clauses"].length == 0) {
        // Needs to start with for or let clause
        if (options instanceof ForClause || options instanceof LetClause) {
            this._properties["clauses"].push(options);
        }
    } else {
        if (options instanceof AQLClause) {
            this._properties["clauses"].push(options);
        }
    }

    return this;
};


FLWOGRExpression.prototype.val = function() {
    var value = AExpression.prototype.val.call(this);

    for (var c in this._properties["clauses"]) {
        value += this._properties["clauses"][c].val() + " ";
    }

    return value + AExpression.prototype.onReturn.call(this);
};

// AQLClause
//
// Base Clause  ::= ForClause | LetClause | WhereClause | OrderbyClause | GroupClause | LimitClause | DistinctClause
function AQLClause() {
    this._properties = {};
    this._properties["clause"] = "";
}

AQLClause.prototype.val = function() {
    var value = this._properties["clause"];

    if (this._properties.hasOwnProperty("return")) {
        value += " return " + this._properties["return"].val();
    }
 
    return value;
};

AQLClause.prototype.bind = function(options) {
    var options = options || {};

    if (options.hasOwnProperty("return")) {
        this._properties["return"] = options["return"];
    }

    return this;
};


// ForClause
//
// Grammar:
// "for" Variable ( "at" Variable )? "in" ( Expression )
//
// @param for_variable [String], REQUIRED, first variable in clause 
// @param at_variable [String], NOT REQUIRED, first variable in clause
// @param expression [AsterixExpression], REQUIRED, expression to evaluate
//
// TODO Error Checking
function ForClause(for_variable, at_variable, expression) {
    AQLClause.call(this);
  
    // at_variable is optional, check if defined
    var at = typeof at_variable ? at_variable : null;

    // Prepare clause
    this._properties["clause"] = "for $" + for_variable;
    if (at != null) {
        this._properties["clause"] += " at $" + at_variable;
    }
    this._properties["clause"] += " in " + expression.val();
    return this;
}

ForClause.prototype = Object.create(AQLClause.prototype);
ForClause.prototype.constructor = ForClause;


// LetClause
//
// Grammar:
// LetClause      ::= "let" Variable ":=" Expression
//
// @param let_variable [String]
// @param expression [AExpression]
//
// TODO Vigorous error checking
function LetClause(let_variable, expression) {
    AQLClause.call(this);
    
    this._properties["clause"] = "let $" + let_variable + " := ";
    this._properties["clause"] += expression.val();
    
    return this; 
}

LetClause.prototype = Object.create(AQLClause.prototype);
LetClause.prototype.constructor = LetClause;


// WhereClause
//
// Grammar: 
// ::= "where" Expression
// 
// @param expression [BooleanExpression], pushes this expression onto the stack
//
// TODO Error fixing
function WhereClause(expression) {
    AQLClause.call(this);

    this._properties["stack"] = [];

    this.bind(expression);

    return this;
}


WhereClause.prototype = Object.create(AQLClause.prototype);
WhereClause.prototype.constructor = WhereClause;


WhereClause.prototype.bind = function(expression) {
    if (expression instanceof BooleanExpression) {
        this._properties["stack"].push(expression);
    }
};


WhereClause.prototype.val = function() {
    var value = "where ";   

    var count = this._properties["stack"].length - 1;
    while (count >= 0) {
        value += this._properties["stack"][count].val() + " ";
        count -= 1;
    }
    
    return value;
}


// BooleanExpression
// 
// TODO
function BooleanExpression(expression) {
    this.value = expression;
} 

BooleanExpression.prototype.val = function() {
    return this.value;
}
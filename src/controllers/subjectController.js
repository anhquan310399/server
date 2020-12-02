const db = require("../models/subject");
const userDb = require('../models/user');
const _ = require('lodash');
const subject = require("../models/subject");

exports.create = async(req, res) => {
    // Validate request
    const data = new db({
        _id: req.body._id,
        name: req.body.name,
        lectureId: req.body.lectureId,
        studentIds: req.body.studentIds,
        timelines: req.body.timelines
    });

    await data.save()
        .then((data) => {
            res.send(data);
        })
        .catch((err) => {
            res.status(500).send({
                message: err.message || "Some error occurred while creating privilege.",
            });
        });
};

exports.findAll = async(req, res) => {
    var idPrivilege = req.idPrivilege;
    if (idPrivilege === 'teacher') {
        db.find({ lectureId: req.idUser, isDeleted: false })
            .then((data) => {
                var info = data.map(function(value) {
                    return { _id: value._id, name: value.name };
                });
                res.send(info);
            })
            .catch((err) => {
                res.status(500).send({
                    message: err.message || "Some error occurred while listing subject.",
                });
            });
    } else if (idPrivilege === 'student') {
        db.find({ 'studentIds': req.idUser, isDeleted: false })
            .then(async function(data) {
                var info = await Promise.all(data.map(async function(value) {
                    var teacher = await userDb.findById(value.lectureId, 'firstName surName urlAvatar')
                        .then(value => {
                            return value
                        });
                    return { _id: value._id, name: value.name, lecture: teacher };
                }));
                res.send(info);
            })
            .catch((err) => {
                res.status(500).send({
                    message: err.message || "Some error occurred while listing subject.",
                });
            });
    }

};

exports.find = async(req, res) => {
    let data = req.subject;
    let timelines = req.subject.timelines;
    if (req.idPrivilege === 'student') {
        timelines.filter((value) => { if (value.isDeleted === false) return true });
    }
    let teacher = await userDb.findById(data.lectureId, 'firstName surName urlAvatar')
        .then(value => { return value });

    let result = {
        _id: data._id,
        name: data.name,
        lecture: teacher,
        timelines: _.sortBy(timelines.map((value) => {
            let forums = value.forums.map((forum) => { return { _id: forum.id, name: forum.name, description: forum.description } });
            let exams = value.exams.map((exam) => { return { _id: exam._id, name: exam.name, description: exam.description } });
            let information = value.information.map((info) => { return { _id: info._id, name: info.name, description: info.description, content: info.content } });
            let assignments = value.assignments.map((assign) => { return { _id: assign._id, name: assign.name, description: assign.description } });
            if (req.idPrivilege === 'student') {
                return { _id: value._id, name: value.name, description: value.description, forums: forums, exams: exams, information: information, assignments: assignments, index: value.index };
            } else {
                return { _id: value._id, name: value.name, description: value.description, forums: forums, exams: exams, information: information, assignments: assignments, index: value.index, isDeleted: value.isDeleted };
            }
        }), ['index']),
    };
    res.send(result);
};

exports.update = async(req, res) => {
    if (!req.body) {
        return res.status(400).send({
            message: "Lack of information",
        });
    };
    await db.findByIdAndUpdate(
            req.params.idSubject, {
                name: req.body.name,
                lectureId: req.body.lectureId
            }
        )
        .then((data) => {
            if (!data) {
                return res.status(404).send({
                    message: "Not found Subject",
                });
            }
            res.send("Update Successfully");
        })
        .catch((err) => {
            console.log("Update subject: " + err.message);
            return res.status(500).send({
                message: "Update Failure"
            });
        });
};

exports.delete = async(req, res) => {
    await db.findByIdAndUpdate(
            req.params.idSubject, {
                isDeleted: true
            }
        )
        .then((data) => {
            if (!data) {
                return res.status(404).send({
                    message: "Not found Subject",
                });
            }
            res.send("Delete Successfully");
        })
        .catch((err) => {
            console.log("Delete subject" + err.message);
            return res.status(500).send({
                message: "Delete Failure"
            });
        });
};


exports.addAllStudents = (req, res) => {
    // Validate request
    db.findById(req.params.idSubject)
        .then((data) => {
            if (!data) {
                return res.status(404).send({
                    message: "Not found subject",
                });
            }

            var list = data.studentIds.concat(req.body).sort();
            list = list.filter((a, b) => list.indexOf(a) === b);
            data.studentIds = list;
            data.save()
                .then((data) => {
                    // res.send(data);
                    res.send("Add Student Successfully!")
                })
                .catch((err) => {
                    console.log("Add student" + err.message);
                    res.status(500).send({
                        message: "Add student failure"
                    });
                });
        })
        .catch((err) => {
            return res.status(500).send({
                message: err.message,
            });
        });
};

exports.adjustOrderOfTimeline = async(req, res) => {
    const adjust = req.body;
    const subject = req.subject;
    await adjust.forEach(element => {
        var timeline = subject.timelines.find(x => x._id == element._id);
        console.log(timeline);
        timeline.index = element.index;
    });
    await subject.save()
        .then(data => {
            let result = {
                _id: data._id,
                name: data.name,
                timelines: _.sortBy(data.timelines.map((value) => {
                    return { _id: value._id, name: value.name, description: value.description, index: value.index, isDeleted: value.isDeleted };
                }), ['index']),
            };
            res.send(result);
        }).catch(err => {
            console.log("adjust index timeline" + err.message);
            res.status(500).send({ message: "Đã có lỗi xảy ra" });
        })
}

exports.getOrderOfTimeLine = async(req, res) => {
    const data = req.subject;
    let result = {
        _id: data._id,
        name: data.name,
        timelines: _.sortBy(data.timelines.map((value) => {
            return { _id: value._id, name: value.name, description: value.description, index: value.index, isDeleted: value.isDeleted };
        }), ['index']),
    };
    res.send(result);
}


exports.getDeadline = async(req, res) => {
    db.find({ 'studentIds': req.idUser, isDeleted: false })
        .then(function(listSubject) {
            let deadline = [];
            const today = Date.now();
            listSubject.forEach(subject => {
                subject.timelines.forEach(timeline => {
                    let exams = timeline.exams.map(exam => {
                        var submission = exam.submissions.find(value => value.idUser === req.idUser)
                        return {
                            idSubject: subject._id,
                            idTimeline: timeline._id,
                            _id: exam._id,
                            name: exam.name,
                            expireTime: exam.expireTime,
                            isSubmit: submission ? true : false,
                            type: 'exam'
                        }
                    }).filter(exam => { return exam.expireTime > today });
                    let assignments = timeline.assignments.map(assignment => {
                        let submission = assignment.submission.find(value => value.idUser === req.idUser);
                        return {
                            idSubject: subject._id,
                            idTimeline: timeline._id,
                            _id: assignment._id,
                            name: assignment.name,
                            expireTime: assignment.setting.expireTime,
                            isSubmit: submission ? true : false,
                            type: 'assignment'
                        }
                    }).filter(assignment => { return assignment.expireTime > today });
                    deadline = deadline.concat(exams, assignments);
                });
            });
            res.send(deadline);
        })
        .catch((err) => {
            res.status(500).send({
                message: err.message || "Some error occurred while listing subject.",
            });
        });
}

exports.getListStudent = async(req, res) => {
    const subject = req.subject;

    var info = await Promise.all(subject.studentIds.map(async function(value) {
        var student = await userDb.findById(value, 'emailAddress firstName surName urlAvatar')
            .then(value => {
                return value
            });
        return student;
    }));
    res.send(info);
}
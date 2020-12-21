const db = require("../models/subject");
const userDb = require('../models/user');
const _ = require('lodash');
const isToday = require('../common/isToday');
exports.create = async(req, res) => {
    // Validate request
    const data = new db({
        name: req.body.name,
        idLecture: req.body.idLecture,
        studentIds: req.body.studentIds,
        timelines: req.body.timelines
    });

    await data.save()
        .then((data) => {
            res.send({
                success: true,
                subject: data
            });
        })
        .catch((err) => {
            console.log(err.name);
            if (err.name === 'ValidationError') {
                const key = Object.keys(err.errors)[0];
                res.status(400).send({
                    success: false,
                    message: err.errors[key].message,
                });
            } else {
                res.status(500).send({
                    success: false,
                    message: err.message,
                });
            }
        });
};

exports.findAll = async(req, res) => {
    var idPrivilege = req.idPrivilege;
    if (idPrivilege === 'teacher') {
        db.find({ idLecture: req.code, isDeleted: false })
            .then((data) => {
                var info = data.map(function(value) {
                    return { _id: value._id, name: value.name };
                });
                res.send({
                    success: true,
                    allSubject: info
                });
            })
            .catch((err) => {
                res.status(500).send({
                    success: false,
                    message: err.message || "Some error occurred while listing subject.",
                });
            });
    } else if (idPrivilege === 'student') {
        db.find({ 'studentIds': req.code, isDeleted: false })
            .then(async function(data) {
                var info = await Promise.all(data.map(async function(value) {
                    var teacher = await userDb.findOne({ code: value.idLecture }, 'code firstName surName urlAvatar')
                        .then(value => {
                            return value
                        });
                    return { _id: value._id, name: value.name, lecture: teacher };
                }));
                res.send({
                    success: true,
                    allSubject: info
                });
            })
            .catch((err) => {
                res.status(500).send({
                    success: false,
                    message: err.message || "Some error occurred while listing subject.",
                });
            });
    }

};

exports.find = async(req, res) => {
    let subject = req.subject;
    let timelines = req.subject.timelines;
    if (req.idPrivilege === 'student') {
        timelines.filter((value) => { if (value.isDeleted === false) return true });
    }
    let teacher = await userDb.findOne({ code: subject.idLecture }, 'code firstName surName urlAvatar')
        .then(value => { return value });

    let result = {
        _id: subject._id,
        name: subject.name,
        lecture: teacher,
        timelines: _.sortBy(timelines.map((value) => {
            let forums = value.forums.map((forum) => { return { _id: forum.id, name: forum.name, description: forum.description, time: forum.createdAt, isNew: isToday(forum.updatedAt) } });
            let exams = value.exams.map((exam) => { return { _id: exam._id, name: exam.name, description: exam.description, time: exam.createdAt, isNew: isToday(exam.createdAt) } });
            let information = value.information.map((info) => { return { _id: info._id, name: info.name, content: info.content, time: info.createdAt, isNew: isToday(info.updatedAt) } });
            let assignments = value.assignments.map((assign) => { return { _id: assign._id, name: assign.name, description: assign.description, time: assign.createdAt, isNew: isToday(assign.createdAt) } });
            if (req.idPrivilege === 'student') {
                return { _id: value._id, name: value.name, description: value.description, forums: forums, exams: exams, information: information, assignments: assignments, files: value.files, index: value.index };
            } else {
                return { _id: value._id, name: value.name, description: value.description, forums: forums, exams: exams, information: information, assignments: assignments, files: value.files, index: value.index, isDeleted: value.isDeleted };
            }
        }), ['index']),
    };
    res.send({
        success: true,
        subject: result
    });
};

exports.update = async(req, res) => {
    if (!req.body || !(req.body.name && req.body.idLecture)) {
        return res.status(400).send({
            success: false,
            message: "Lack of information",
        });
    };
    await db.findByIdAndUpdate(
            req.params.idSubject, {
                name: req.body.name,
                idLecture: req.body.idLecture
            }
        )
        .then((data) => {
            if (!data) {
                return res.status(404).send({
                    success: false,
                    message: "Not found Subject",
                });
            }
            res.send({
                success: true,
                message: "Update Subject Successfully"
            });
        })
        .catch((err) => {
            console.log("Update subject: " + err.message);
            console.log(err.name);
            if (err.name === 'ValidationError') {
                const key = Object.keys(err.errors)[0];
                res.status(400).send({
                    success: false,
                    message: err.errors[key].message,
                });
            } else {
                res.status(500).send({
                    success: false,
                    message: err.message,
                });
            }
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
                    success: false,
                    message: "Not found Subject",
                });
            }
            res.send({
                success: true,
                message: "Delete Subject Successfully"
            });
        })
        .catch((err) => {
            console.log("Delete subject" + err.message);
            return res.status(500).send({
                success: false,
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
                    success: false,
                    message: "Not found subject",
                });
            }
            var list = data.studentIds.concat(req.body).sort();
            list = list.filter((a, b) => list.indexOf(a) === b);
            data.studentIds = list;
            data.save()
                .then((data) => {
                    // res.send(data);
                    res.send({
                        success: true,
                        message: "Add Student Successfully!"
                    })
                })
                .catch((err) => {
                    console.log("Add student" + err.message);
                    res.status(500).send({
                        success: false,
                        message: "Add student failure"
                    });
                });
        })
        .catch((err) => {
            return res.status(500).send({
                success: false,
                message: err.message,
            });
        });
};

exports.addStudent = (req, res) => {
    // Validate request
    let subject = req.subject;

    let idStudent = subject.studentIds.find(value => { return value === req.body.idStudent });
    if (idStudent) {
        return res.send({
            success: false,
            message: 'This student has already in subject'
        });
    }

    userDb.findOne({ code: req.body.idStudent, idPrivilege: 'student' }, 'code firstName surName urlAvatar')
        .then(user => {
            if (!user) {
                return res.status(404).send({
                    success: false,
                    message: "Not found student with id: " + req.body.idStudent
                });
            }
            subject.studentIds.push(req.body.idStudent);
            subject.save()
                .then((data) => {
                    // res.send(data);
                    res.send({
                        success: true,
                        message: "Add Student Successfully!",
                        student: user
                    });
                })
                .catch((err) => {
                    console.log("Add student" + err.message);
                    res.status(500).send({
                        success: false,
                        message: "Add student failure"
                    });
                });
        });
};

exports.removeStudent = (req, res) => {
    // Validate request
    let subject = req.subject;

    let index = subject.studentIds.indexOf(req.body.idStudent);
    if (index === -1) {
        return res.send({
            success: false,
            message: 'Not found this student with id: ' + req.body.idStudent
        });
    }
    subject.studentIds.splice(index, 1);
    subject.save()
        .then((data) => {
            // res.send(data);
            res.send({
                success: true,
                message: "Remove Student Successfully!"
            });
        })
        .catch((err) => {
            console.log("Remove student" + err.message);
            res.status(500).send({
                success: false,
                message: "Remove student failure"
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
        timeline.name = element.name;
    });
    await subject.save()
        .then(data => {
            // let result = {
            //     _id: data._id,
            //     name: data.name,
            //     timelines: _.sortBy(data.timelines.map((value) => {
            //         return { _id: value._id, name: value.name, description: value.description, index: value.index, isDeleted: value.isDeleted };
            //     }), ['index']),
            // };
            // res.send(result);
            res.send({
                success: true,
                message: 'Adjust index of timeline successfully!'
            })
        }).catch(err => {
            console.log("adjust index timeline" + err.message);
            res.status(500).send({
                success: false,
                message: "Đã có lỗi xảy ra"
            });
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
    res.send({
        success: true,
        orderTimeline: result
    });
}

exports.getDeadline = async(req, res) => {
    db.find({ 'studentIds': req.code, isDeleted: false })
        .then(function(listSubject) {
            let deadline = [];
            const today = Date.now();
            listSubject.forEach(subject => {
                subject.timelines.forEach(timeline => {
                    let exams = timeline.exams.map(exam => {
                        var submission = exam.submissions.find(value => value.idStudent == req.idUser)
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
                        let submission = assignment.submissions.find(value => value.idStudent == req.idUser);
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
                success: false,
                message: err.message || "Some error occurred while listing subject.",
            });
        });
}

exports.getListStudent = async(req, res) => {
    const subject = req.subject;

    var info = await Promise.all(subject.studentIds.map(async function(value) {
        var student = await userDb.findOne({ code: value }, 'code emailAddress firstName surName urlAvatar')
            .then(value => {
                return value
            });
        return student;
    }));
    res.send({
        success: true,
        students: info
    });
}

exports.getSubjectTranscript = async(req, res) => {
    let subject = req.subject;
    let today = Date.now();
    let fields = await getListAssignmentExam(subject, today);

    if (req.user.idPrivilege === 'student') {
        let transcript = await Promise.all(fields.map(async(field) => {
            let submission = await field.submissions.find(value => value.idStudent == req.user._id);
            let grade = 0;
            let status;
            if (field.type === 'exam') {
                if (submission) {
                    grade = submission.grade;
                    status = 'completed';
                } else if (field.isRemain) {
                    grade = null;
                    status = 'notSubmit';
                } else {
                    grade = 0;
                    status = 'completed'
                }
            } else {
                if (submission) {
                    if (submission.isGrade) {
                        grade = submission.grade;
                        status = 'completed';
                    } else {
                        grade = null;
                        status = 'notGrade';
                    }
                } else if (field.isRemain) {
                    grade = null;
                    status = 'notSubmit';
                } else {
                    grade = 0;
                    status = 'completed'
                }
            }
            return {
                name: field.name,
                grade: grade,
                status: status
            }
        }))
        return res.send(transcript);
    } else {
        let transcript = await Promise.all(fields.map(async(field) => {
            let submissions = await Promise.all(subject.studentIds.map(
                async(value) => {
                    let student = await userDb.findOne({ code: value }, 'code firstName surName urlAvatar')
                        .then(value => { return value });

                    let submission = field.submissions.find(value => value.idStudent == student._id);
                    let isRemain = field.isRemain;

                    if (submission) {
                        if (field.type === 'exam') {
                            return {
                                student: student,
                                grade: submission.grade,
                                status: 'completed'
                            }
                        } else if (field.type === 'assignment') {
                            if (submission.isGrade) {
                                return {
                                    student: student,
                                    grade: submission.grade,
                                    status: 'completed'
                                }
                            } else {
                                return {
                                    student: student,
                                    grade: null,
                                    status: 'notGrade'
                                }
                            }
                        }

                    } else if (isRemain) {
                        return {
                            student: student,
                            grade: null,
                            status: 'notSubmit'
                        }
                    } else {
                        return {
                            student: student,
                            grade: 0,
                            status: 'completed'
                        }
                    }
                }))
            return {
                _id: field._id,
                name: field.name,
                submissions: submissions
            }
        }));

        return res.send(transcript);
    }
}

exports.getSubjectTranscriptTotal = async(req, res) => {
    let subject = req.subject;
    let today = Date.now();
    let assignmentOrExam = await getListAssignmentExam(subject, today);

    let fields = { 'c0': 'MSSV', 'c1': 'Họ', 'c2': 'Tên' }
    let ratios = { 'c0': null, 'c1': null, 'c2': null }
    let count = 3;
    let totalRatio = 0;
    assignmentOrExam.forEach(value => {
        let key = 'c' + count++;
        fields[key] = value.name;
        let transcript = subject.transcript.find(ratio => ratio.idField == value._id);
        ratios[key] = {
            _id: transcript._id,
            ratio: transcript.ratio
        };
        totalRatio += transcript.ratio;
    });

    let data = await Promise.all(subject.studentIds.map(
        async(value) => {
            let student = await userDb.findOne({ code: value }, 'code firstName surName urlAvatar')
                .then(value => { return value });
            let data = { 'c0': student.code, 'c1': student.surName, 'c2': student.firstName };
            let count = 3;
            let grade = await Promise.all(assignmentOrExam.map(async(value) => {
                let submission = value.submissions.find(value => value.idStudent == student._id);
                if (submission) {
                    return submission.grade;
                } else if (value.isRemain) {
                    return null;
                } else {
                    return 0;
                }

            }));
            let total = 0;
            grade.forEach(value => {
                let key = 'c' + count++;
                data[key] = value;
                total += (data[key] * ratios[key].ratio);
            });
            let key = 'c' + count;
            data[key] = (total / totalRatio).toFixed(2);
            ratios[key] = null;
            fields[key] = 'Trung bình';
            return data;
        }
    ));

    return res.send({
        fields: fields,
        ratio: ratios,
        data: data
    });

}

exports.updateRatioTranscript = async(req, res) => {
    let subject = req.subject;
    let adjust = req.body.data;
    await adjust.forEach(async(value) => {
        let transcript = await subject.transcript.find(ratio => ratio._id == value._id);
        if (transcript) {
            transcript.ratio = value.ratio;
        }
    });

    await subject.save()
        .then(data => {
            res.send({
                success: true,
                message: 'Update ratio transcript successfully!'
            });
        }).catch(err => {
            console.log("adjust ratio transcript" + err.message);
            res.status(500).send({
                success: false,
                message: 'Update ratio transcript failure!'
            });
        })
}

//Function

const getListAssignmentExam = async(subject, today) => {
    let assignmentOrExam = await subject.timelines.reduce(
        async(preField, currentTimeline) => {
            let exams = await Promise.all(currentTimeline.exams.map(async(exam) => {
                if (exam.isDeleted) {
                    return null;
                }
                let exists = [];
                let submissions = await exam.submissions.reduce(function(prePromise, submission) {
                    let exist = exists.find(value => value.idStudent == submission.idStudent);
                    if (exist) {
                        let existSubmission = prePromise[exist.index];
                        prePromise[exist.index].grade = existSubmission.grade >= submission.grade ? existSubmission.grade : submission.grade;
                        return prePromise;
                    } else {
                        exists = exists.concat({
                            idStudent: submission.idStudent,
                            grade: submission.grade,
                            index: prePromise.length
                        })
                        return prePromise.concat({
                            // _id: submission._id,
                            idStudent: submission.idStudent,
                            grade: submission.grade
                        })
                    }
                }, []);
                let isRemain = today <= exam.expireTime;
                return {
                    // idSubject: subject._id,
                    // idTimeline: currentTimeline._id,
                    _id: exam._id,
                    name: exam.name,
                    isRemain: isRemain,
                    submissions: submissions,
                    type: 'exam',
                }
            }));
            let assignments = await Promise.all(currentTimeline.assignments.map(async(assignment) => {
                if (assignment.isDeleted) {
                    return null;
                }

                let submissions = await Promise.all(assignment.submissions.map(async(submission) => {
                    return {
                        // _id: submission._id,
                        idStudent: submission.idStudent,
                        grade: submission.feedBack ? submission.feedBack.grade : 0,
                        isGrade: submission.feedBack ? true : false,
                    }
                }));

                let isRemain = today <= assignment.setting.expireTime;

                return {
                    // idSubject: subject._id,
                    // idTimeline: currentTimeline._id,
                    _id: assignment._id,
                    name: assignment.name,
                    isRemain: isRemain,
                    submissions: submissions,
                    type: 'assignment'
                }
            }));

            let currentFields = exams.concat(assignments);
            let result = await preField;
            return result.concat(currentFields);
        }, []);
    assignmentOrExam = await (assignmentOrExam.filter((value) => {
        return (value !== null);
    }));

    return assignmentOrExam;
}